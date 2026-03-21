# AutoBounty

Decentralized bug bounty platform combining Solidity escrow contracts with GenLayer intelligent contracts for automated vulnerability judging.

## Architecture

- **contracts/solidity/** - `BountyEscrow.sol` handles fund locking and payout on Ethereum/EVM chains
- **contracts/genlayer/** - `BountyJudge.py` is a GenLayer intelligent contract that evaluates submissions using AI
- **relayer/** - Node.js service bridging GenLayer verdicts to the on-chain escrow
- **frontend/** - Web interface for submitting and managing bounties
- **docs/** - Hackathon documentation and specs

## Getting Started

### Prerequisites

- [Foundry](https://book.getfoundry.sh/) for Solidity development
- Node.js >= 18 for the relayer
- Python 3.11+ for GenLayer contracts

### Build & Test Solidity Contracts

```bash
cd contracts/solidity
forge build
forge test
```

### Run the Relayer

```bash
cd relayer
cp .env.example .env
# fill in your .env values
npm install
node index.js
```

## License

MIT
