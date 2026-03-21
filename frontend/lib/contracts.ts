import { parseAbi } from 'viem'

// Deployed on Avalanche Fuji
export const ESCROW_ADDRESS = '0xF284251509ebcb1AFc111e27dF889703815AeE39' as const
export const USDC_ADDRESS = '0x4a7B3cD32D8f43FaDb08Cb2d0752BB87328b574d' as const
export const RELAYER_API = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:3100'

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
