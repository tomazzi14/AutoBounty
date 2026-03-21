# AutoBounty

Automated GitHub bounty verification using decentralized AI consensus.

GenLayer validators evaluate PRs against issues. Avalanche handles escrow. No human reviewers. Minutes, not weeks.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────────────┐     ┌──────────────┐
│  GitHub Repo │     │  Avalanche   │     │        GenLayer           │     │  Avalanche   │
│              │     │              │     │                          │     │              │
│  Issue #42   │────>│ Create Bounty│────>│  5 LLMs evaluate PR vs  │────>│ Release mUSDC│
│  + PR #43    │     │ (lock mUSDC) │     │  issue independently    │     │ to solver    │
└──────────────┘     └──────────────┘     └──────────────────────────┘     └──────────────┘
```

## How it works

GitHub bounty platforms move $100M+/year in developer rewards, but verification is 100% manual. A maintainer has to review every PR, compare it against the issue requirements, and approve the payout. This takes 3-15 days. Small bounties ($50-200) often never get reviewed at all.

AutoBounty replaces the human reviewer with GenLayer's decentralized AI consensus. When a contributor submits a PR, five independent validators — each running a different LLM (GPT, Claude, Gemini, Llama) — scrape the GitHub API, read the issue and the PR, and independently evaluate whether the work meets the requirements.

GenLayer is the only blockchain that can read arbitrary web pages on-chain, reason about code quality in natural language, and achieve multi-model consensus on subjective evaluations. A single LLM is gameable. Five independent models are not.

## Architecture

| Component | Chain | Description |
|-----------|-------|-------------|
| `BountyEscrow.sol` | Avalanche Fuji | Solidity contract. Locks mUSDC in escrow, releases payment based on verdict. |
| `MockUSDC.sol` | Avalanche Fuji | Freely mintable ERC-20 (6 decimals) for testnet bounties. |
| `BountyJudge.py` | GenLayer Bradbury | Intelligent Contract. Fetches GitHub API data, evaluates PR via Optimistic Democracy consensus (Equivalence Principle Pattern 4: `prompt_non_comparative`). |
| `relayer/index.js` | Off-chain | Bridges events between Avalanche and GenLayer. Submits solutions, triggers evaluation, resolves bounties. |

## Setup

### Prerequisites

- Docker 26+
- Node.js 18+
- Foundry (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- API key: OpenAI or Anthropic (for GenLayer Studio validators)

### GenLayer

```bash
npm install -g genlayer
genlayer init                        # select your LLM provider
genlayer up                          # Studio runs at localhost:8080 (local dev)
```

Deploy to Testnet Bradbury:

```bash
genlayer network testnet-bradbury    # switch to public testnet
genlayer deploy contracts/genlayer/BountyJudge.py
```

> **Consensus model:** GenLayer uses Optimistic Democracy by default. When `BountyJudge` calls `prompt_non_comparative` (Equivalence Principle Pattern 4), the leader node evaluates the PR, then validators independently verify whether the verdict is reasonable. If a validator disagrees, an appeal round kicks in automatically. No extra code needed.

### Avalanche (Solidity)

```bash
cd contracts/solidity
forge install
forge build
forge test
```

Deploy to Fuji:

```bash
# Deploy MockUSDC first
forge create --rpc-url https://api.avax-test.network/ext/bc/C/rpc \
  --private-key $PK \
  src/MockUSDC.sol:MockUSDC

# Deploy BountyEscrow with relayer address + mUSDC address
forge create --rpc-url https://api.avax-test.network/ext/bc/C/rpc \
  --private-key $PK \
  src/BountyEscrow.sol:BountyEscrow \
  --constructor-args $RELAYER_ADDRESS $MUSDC_ADDRESS
```

### Relayer

```bash
cd relayer
npm install
cp .env.example .env   # edit with your contract addresses and keys
node index.js
```

## Tech Stack

| Tech | Role |
|------|------|
| GenLayer (Bradbury testnet) | AI consensus — web scraping + LLM evaluation + Optimistic Democracy |
| Avalanche (Fuji testnet) | Escrow — lock/release mUSDC via Solidity |
| Foundry | Solidity toolchain — build, test, deploy |
| viem | Avalanche client in the relayer |
| genlayer-js | GenLayer client in the relayer |

## Hackathon

- **Aleph Hackathon** — Track: Future of Work
- **GenLayer Bradbury Builders Hackathon** — March 20 - April 3, 2026
- **Portal:** https://portal.genlayer.foundation

## License

MIT