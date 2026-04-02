// TODO: add validation
import { parseAbi } from 'viem'
import { avalancheFuji, avalanche } from 'wagmi/chains'

export const NETWORKS = {
  testnet: {
    name: 'Fuji Testnet',
    chain: avalancheFuji,
    escrowAddress: '0xB61Dc153eB4B149C5cb6Ed46FD67c62063311932' as `0x${string}`,
    usdcAddress: '0x4a7B3cD32D8f43FaDb08Cb2d0752BB87328b574d' as `0x${string}`,
    usdcSymbol: 'mUSDC',
    canMint: true, // MockUSDC has a public mint()
    relayerApi: process.env.NEXT_PUBLIC_RELAYER_URL_TESTNET || 'http://localhost:3100',
  },
  mainnet: {
    name: 'Avalanche',
    chain: avalanche,
    escrowAddress: (process.env.NEXT_PUBLIC_MAINNET_ESCROW_ADDRESS || '0xB61Dc153eB4B149C5cb6Ed46FD67c62063311932') as `0x${string}`,
    usdcAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E' as `0x${string}`,
    usdcSymbol: 'USDC',
    canMint: false, // Real USDC
    relayerApi: process.env.NEXT_PUBLIC_RELAYER_URL_MAINNET || 'http://localhost:3101',
  },
} as const

export type Network = keyof typeof NETWORKS

// Legacy exports — kept for backward compat, default to testnet
export const ESCROW_ADDRESS = NETWORKS.testnet.escrowAddress
export const USDC_ADDRESS = NETWORKS.testnet.usdcAddress
export const RELAYER_API = NETWORKS.testnet.relayerApi

export const ESCROW_ABI = parseAbi([
  'function createBounty(string issueURL, uint256 amount) external',
  'function submitSolution(uint256 bountyId, string prURL, address solver) external',
  'function resolveBounty(uint256 bountyId, bool approved) external',
  'function bounties(uint256) external view returns (uint256 id, address creator, string issueURL, string prURL, uint256 amount, address solver, uint8 status)',
  'function bountyCount() external view returns (uint256)',
  'event BountyCreated(uint256 indexed bountyId, address creator, string issueURL, uint256 amount)',
])

export const USDC_ABI = parseAbi([
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function mint(address to, uint256 amount) external',
  'function decimals() external view returns (uint8)',
])

export const STATUS_MAP = ['Open', 'Submitted', 'Approved', 'Rejected'] as const
