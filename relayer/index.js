import "dotenv/config";
import express from "express";
import { createPublicClient, createWalletClient, http, webSocket, parseAbiItem, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji } from "viem/chains";
import { createClient as createGenlayerClient } from "genlayer-js";
import { simulator } from "genlayer-js/chains";

const {
  AVALANCHE_RPC_URL,
  AVALANCHE_WS_URL,
  PRIVATE_KEY,
  ESCROW_CONTRACT_ADDRESS,
  GENLAYER_RPC_URL,
  GENLAYER_CONTRACT_ADDRESS,
  GENLAYER_PRIVATE_KEY,
  PORT = "3000",
} = process.env;

// --- Avalanche setup ---

const ESCROW_ABI = parseAbi([
  "function submitSolution(uint256 bountyId, string prURL, address solver) external",
  "function resolveBounty(uint256 bountyId, bool approved) external",
  "function bounties(uint256) external view returns (uint256 id, address creator, string issueURL, string prURL, uint256 amount, address solver, uint8 status)",
  "function bountyCount() external view returns (uint256)",
  "event BountyCreated(uint256 indexed bountyId, address creator, string issueURL, uint256 amount)",
]);

const account = privateKeyToAccount(PRIVATE_KEY);

const publicClient = createPublicClient({
  chain: avalancheFuji,
  transport: http(AVALANCHE_RPC_URL),
});

const walletClient = createWalletClient({
  account,
  chain: avalancheFuji,
  transport: http(AVALANCHE_RPC_URL),
});

// --- GenLayer setup ---

const glClient = createGenlayerClient({
  chain: simulator,
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

  // 3. Read verdict
  console.log(`\n[3/4] Reading verdict from GenLayer...`);
  const verdict = await glClient.readContract({
    address: GENLAYER_CONTRACT_ADDRESS,
    functionName: "get_verdict",
    args: [],
  });
  console.log(`  Verdict:`, verdict);

  const approved = verdict.approved === true;
  console.log(`  Result: ${approved ? "APPROVED ✓" : "REJECTED ✗"} (score: ${verdict.score})`);
  console.log(`  Reasoning: ${verdict.reasoning}`);

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
