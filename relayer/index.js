import { ethers } from "ethers";
import { createClient } from "genlayer-js";
import "dotenv/config";

const {
  RPC_URL,
  PRIVATE_KEY,
  ESCROW_ADDRESS,
  GENLAYER_RPC_URL,
  GENLAYER_CONTRACT_ADDRESS,
  POLL_INTERVAL_MS = "15000",
} = process.env;

const ESCROW_ABI = [
  "function releasePayout(uint256 bountyId, address reporter, uint256 amount) external",
];

const SEVERITY_PAYOUTS = {
  critical: ethers.parseEther("1.0"),
  high: ethers.parseEther("0.5"),
  medium: ethers.parseEther("0.25"),
  low: ethers.parseEther("0.1"),
  informational: ethers.parseEther("0"),
};

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, wallet);

  const glClient = createClient({ endpoint: GENLAYER_RPC_URL });

  console.log("AutoBounty relayer started");
  console.log(`Escrow: ${ESCROW_ADDRESS}`);
  console.log(`GenLayer contract: ${GENLAYER_CONTRACT_ADDRESS}`);

  const processedSubmissions = new Set();

  async function poll() {
    try {
      // Query GenLayer for recent verdicts
      const result = await glClient.readContract({
        address: GENLAYER_CONTRACT_ADDRESS,
        functionName: "get_bounty",
        args: ["bounty-0"],
      });

      if (!result || !result.submissions) return;

      for (let i = 0; i < result.submissions.length; i++) {
        const sub = result.submissions[i];
        const key = `bounty-0:${i}`;

        if (processedSubmissions.has(key)) continue;
        if (sub.verdict === null) continue;

        if (sub.verdict === true && sub.severity !== "informational") {
          const amount = SEVERITY_PAYOUTS[sub.severity] || ethers.parseEther("0");
          console.log(
            `Releasing payout: bounty=0, reporter=${sub.reporter}, severity=${sub.severity}, amount=${ethers.formatEther(amount)} ETH`
          );

          const tx = await escrow.releasePayout(0, sub.reporter, amount);
          await tx.wait();
          console.log(`Payout tx confirmed: ${tx.hash}`);
        } else {
          console.log(`Submission ${i} rejected or informational, skipping payout`);
        }

        processedSubmissions.add(key);
      }
    } catch (err) {
      console.error("Poll error:", err.message);
    }
  }

  setInterval(poll, Number(POLL_INTERVAL_MS));
  poll();
}

main();
