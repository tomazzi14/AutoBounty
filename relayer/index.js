import "dotenv/config";
import { createPublicClient, createWalletClient, http, webSocket, parseAbiItem, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji } from "viem/chains";
import { createClient as createGenlayerClient } from "genlayer-js";

const {
  AVALANCHE_RPC_URL,
  AVALANCHE_WS_URL,
  PRIVATE_KEY,
  ESCROW_CONTRACT_ADDRESS,
  GENLAYER_RPC_URL,
  GENLAYER_CONTRACT_ADDRESS,
  GENLAYER_PRIVATE_KEY,
} = process.env;

const ESCROW_ABI = parseAbi([
  "function submitSolution(uint256 bountyId, string prURL, address solver) external",
  "function resolveBounty(uint256 bountyId, bool approved) external",
  "function bounties(uint256) external view returns (uint256 id, address creator, string issueURL, string prURL, uint256 amount, address solver, uint8 status)",
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

const wsClient = createPublicClient({
  chain: avalancheFuji,
  transport: webSocket(AVALANCHE_WS_URL),
});

const glClient = createGenlayerClient({
  endpoint: GENLAYER_RPC_URL,
  privateKey: GENLAYER_PRIVATE_KEY,
});

async function pollGenLayerTx(txHash, intervalMs = 3000, maxAttempts = 100) {
  for (let i = 0; i < maxAttempts; i++) {
    const receipt = await glClient.request("gen_getTransactionReceipt", [txHash]);
    if (receipt && receipt.status === "FINALIZED") {
      console.log(`GenLayer tx ${txHash} finalized`);
      return receipt;
    }
    console.log(`Waiting for GenLayer tx... attempt ${i + 1}/${maxAttempts}`);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`GenLayer tx ${txHash} did not finalize after ${maxAttempts} attempts`);
}

async function handlePRSubmission(bountyId, issueURL, prURL, solverAddress) {
  console.log(`\n--- New PR submission detected ---`);
  console.log(`Bounty ID: ${bountyId}`);
  console.log(`Issue: ${issueURL}`);
  console.log(`PR: ${prURL}`);
  console.log(`Solver: ${solverAddress}`);

  // 1. Relayer submits the solution on-chain (only relayer can call submitSolution)
  console.log("Submitting solution on Avalanche...");
  const submitHash = await walletClient.writeContract({
    address: ESCROW_CONTRACT_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "submitSolution",
    args: [bountyId, prURL, solverAddress],
  });
  await publicClient.waitForTransactionReceipt({ hash: submitHash });
  console.log(`Solution submitted on-chain: ${submitHash}`);

  // 2. Call GenLayer to evaluate the PR
  console.log("Calling GenLayer evaluate()...");
  const glTxHash = await glClient.writeContract({
    address: GENLAYER_CONTRACT_ADDRESS,
    functionName: "evaluate",
    args: [issueURL, prURL],
  });
  console.log(`GenLayer tx submitted: ${glTxHash}`);

  await pollGenLayerTx(glTxHash);

  // 3. Read the verdict
  console.log("Reading verdict from GenLayer...");
  const verdictRaw = await glClient.readContract({
    address: GENLAYER_CONTRACT_ADDRESS,
    functionName: "get_verdict",
    args: [prURL],
  });
  console.log(`Raw verdict: ${verdictRaw}`);

  const verdict = JSON.parse(verdictRaw);
  const approved = verdict.approved === true;
  console.log(`Verdict: approved=${approved}, score=${verdict.score}, reasoning=${verdict.reasoning}`);

  // 4. Resolve the bounty on Avalanche
  console.log(`Calling resolveBounty(${bountyId}, ${approved})...`);
  const resolveHash = await walletClient.writeContract({
    address: ESCROW_CONTRACT_ADDRESS,
    abi: ESCROW_ABI,
    functionName: "resolveBounty",
    args: [bountyId, approved],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: resolveHash });
  console.log(`Avalanche tx confirmed: ${receipt.transactionHash}`);
  console.log(`Bounty ${bountyId} resolved: ${approved ? "APPROVED ✓" : "REJECTED ✗"}`);
}

async function main() {
  console.log("AutoBounty Relayer started");
  console.log(`Escrow: ${ESCROW_CONTRACT_ADDRESS}`);
  console.log(`GenLayer: ${GENLAYER_CONTRACT_ADDRESS}`);
  console.log("Listening for BountyCreated events...\n");

  // Listen for new bounties — the relayer manages the full lifecycle:
  // 1. Detects bounty creation
  // 2. When a PR is submitted off-chain (GitHub webhook), calls submitSolution
  // 3. Evaluates via GenLayer
  // 4. Resolves the bounty
  wsClient.watchEvent({
    address: ESCROW_CONTRACT_ADDRESS,
    event: parseAbiItem(
      "event BountyCreated(uint256 indexed bountyId, address creator, string issueURL, uint256 amount)"
    ),
    onLogs: (logs) => {
      for (const log of logs) {
        console.log(`New bounty #${log.args.bountyId} created for ${log.args.issueURL} (${log.args.amount} mUSDC)`);
      }
    },
  });
}

// Export handlePRSubmission for external triggers (GitHub webhook, CLI, etc.)
export { handlePRSubmission };

main();
