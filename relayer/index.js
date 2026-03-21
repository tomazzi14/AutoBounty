import "dotenv/config";
import express from "express";
import { createPublicClient, createWalletClient, http, webSocket, parseAbiItem, parseAbi, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji } from "viem/chains";
import { foundry } from "viem/chains";
import { createClient as createGenlayerClient } from "genlayer-js";
import { localnet } from "genlayer-js/chains";

const {
  AVALANCHE_RPC_URL,
  AVALANCHE_WS_URL,
  PRIVATE_KEY,
  ESCROW_CONTRACT_ADDRESS,
  GENLAYER_RPC_URL,
  GENLAYER_CONTRACT_ADDRESS,
  GENLAYER_PRIVATE_KEY,
  PORT = "3000",
  CHAIN = "fuji",
} = process.env;

// --- Avalanche setup ---

const evmChain = CHAIN === "local" ? foundry : avalancheFuji;

const ESCROW_ABI = parseAbi([
  "function submitSolution(uint256 bountyId, string prURL, address solver) external",
  "function resolveBounty(uint256 bountyId, bool approved) external",
  "function bounties(uint256) external view returns (uint256 id, address creator, string issueURL, string prURL, uint256 amount, address solver, uint8 status)",
  "function bountyCount() external view returns (uint256)",
  "event BountyCreated(uint256 indexed bountyId, address creator, string issueURL, uint256 amount)",
]);

const account = privateKeyToAccount(PRIVATE_KEY);

const publicClient = createPublicClient({
  chain: evmChain,
  transport: http(AVALANCHE_RPC_URL),
});

const walletClient = createWalletClient({
  account,
  chain: evmChain,
  transport: http(AVALANCHE_RPC_URL),
});

// --- GenLayer setup ---

const glClient = createGenlayerClient({
  chain: localnet,
  endpoint: GENLAYER_RPC_URL,
  account: privateKeyToAccount(GENLAYER_PRIVATE_KEY),
});

// --- GenLayer polling ---

async function pollGenLayerTx(txHash, intervalMs = 3000, maxAttempts = 100) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const receipt = await glClient.request({
        method: "eth_getTransactionReceipt",
        params: [txHash],
      });
      if (receipt && receipt.status === "0x1") {
        console.log(`  GenLayer tx finalized: ${txHash}`);
        return receipt;
      }
    } catch (e) {
      // tx not ready yet
    }
    console.log(`  Waiting for GenLayer consensus... (${i + 1}/${maxAttempts})`);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`GenLayer tx ${txHash} did not finalize after ${maxAttempts} attempts`);
}

// --- GenLayer view call helper ---

async function readGenLayerView(functionName) {
  // glClient.readContract uses eth_call internally which should work
  // Retry with delays since state may not be immediately available
  for (let i = 0; i < 5; i++) {
    try {
      return await glClient.readContract({
        address: GENLAYER_CONTRACT_ADDRESS,
        functionName,
        args: [],
      });
    } catch (e) {
      if (i < 4) {
        console.log(`  Retry reading ${functionName}... (${i + 1}/5)`);
        await new Promise((r) => setTimeout(r, 2000));
      } else {
        throw e;
      }
    }
  }
}

// --- Core flow ---

async function handlePRSubmission(bountyId, prURL, solverAddress) {
  // 0. Read bounty to get issueURL
  const bounty = await publicClient.readContract({
    address: ESCROW_CONTRACT_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "bounties",
    args: [BigInt(bountyId)],
  });
  const issueURL = bounty[2]; // issueURL is 3rd field

  console.log(`\n${"=".repeat(50)}`);
  console.log(`NEW PR SUBMISSION`);
  console.log(`${"=".repeat(50)}`);
  console.log(`  Bounty ID : ${bountyId}`);
  console.log(`  Issue     : ${issueURL}`);
  console.log(`  PR        : ${prURL}`);
  console.log(`  Solver    : ${solverAddress}`);

  // 1. Submit solution on Avalanche (only relayer can do this)
  console.log(`\n[1/4] Submitting solution on Avalanche...`);
  const submitHash = await walletClient.writeContract({
    address: ESCROW_CONTRACT_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "submitSolution",
    args: [BigInt(bountyId), prURL, solverAddress],
  });
  await publicClient.waitForTransactionReceipt({ hash: submitHash });
  console.log(`  ✓ Solution submitted: ${submitHash}`);

  // 2. Call GenLayer evaluate
  console.log(`\n[2/4] Calling GenLayer evaluate()...`);
  const glTxHash = await glClient.writeContract({
    address: GENLAYER_CONTRACT_ADDRESS,
    functionName: "evaluate",
    args: [issueURL, prURL],
  });
  console.log(`  GenLayer tx: ${glTxHash}`);

  await pollGenLayerTx(glTxHash);

  // 3. Read verdict via raw JSON-RPC call (bypassing SDK encoding issues)
  console.log(`\n[3/4] Reading verdict from GenLayer...`);

  const verdict = await readGenLayerView("get_verdict");
  const approved = verdict.approved === true;
  const score = verdict.score || 0;
  const reasoning = verdict.reasoning || "unknown";

  console.log(`  Result: ${approved ? "APPROVED ✓" : "REJECTED ✗"} (score: ${score})`);
  console.log(`  Reasoning: ${reasoning}`);

  // 4. Resolve bounty on Avalanche
  console.log(`\n[4/4] Resolving bounty on Avalanche...`);
  const resolveHash = await walletClient.writeContract({
    address: ESCROW_CONTRACT_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "resolveBounty",
    args: [BigInt(bountyId), approved],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: resolveHash });
  console.log(`  ✓ Bounty resolved: ${receipt.transactionHash}`);
  console.log(`\n  Bounty #${bountyId}: ${approved ? "mUSDC sent to solver ✓" : "mUSDC returned to creator ✗"}`);
  console.log(`${"=".repeat(50)}\n`);

  return { approved, score: verdict.score, reasoning: verdict.reasoning };
}

// --- HTTP API for frontend ---

const app = express();
app.use(express.json());

// POST /submit — frontend calls this with bountyId, prURL, solverAddress
app.post("/submit", async (req, res) => {
  const { bountyId, prURL, solverAddress } = req.body;

  if (bountyId === undefined || !prURL || !solverAddress) {
    return res.status(400).json({ error: "Missing bountyId, prURL, or solverAddress" });
  }

  try {
    const result = await handlePRSubmission(bountyId, prURL, solverAddress);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /bounties — list all bounties
app.get("/bounties", async (req, res) => {
  try {
    const count = await publicClient.readContract({
      address: ESCROW_CONTRACT_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "bountyCount",
    });

    const bounties = [];
    for (let i = 0; i < Number(count); i++) {
      const b = await publicClient.readContract({
        address: ESCROW_CONTRACT_ADDRESS,
        abi: ESCROW_ABI,
        functionName: "bounties",
        args: [BigInt(i)],
      });
      bounties.push({
        id: Number(b[0]),
        creator: b[1],
        issueURL: b[2],
        prURL: b[3],
        amount: b[4].toString(),
        solver: b[5],
        status: ["Open", "Submitted", "Approved", "Rejected"][Number(b[6])],
      });
    }

    res.json(bounties);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /health
app.get("/health", (req, res) => {
  res.json({ status: "ok", escrow: ESCROW_CONTRACT_ADDRESS, genlayer: GENLAYER_CONTRACT_ADDRESS });
});

// --- Start ---

async function main() {
  console.log("AutoBounty Relayer v1.0");
  console.log(`Escrow   : ${ESCROW_CONTRACT_ADDRESS}`);
  console.log(`GenLayer : ${GENLAYER_CONTRACT_ADDRESS}`);
  console.log(`Relayer  : ${account.address}`);

  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
    console.log(`\nEndpoints:`);
    console.log(`  POST /submit   — { bountyId, prURL, solverAddress }`);
    console.log(`  GET  /bounties — list all bounties`);
    console.log(`  GET  /health   — check status\n`);
  });
}

main();
