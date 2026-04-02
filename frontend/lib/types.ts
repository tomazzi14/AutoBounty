export type BountyStatus = 'open' | 'submitted' | 'evaluating' | 'approved' | 'rejected'
export type AgentStatus = 'active' | 'evaluating' | 'idle'
export type SolverType = 'human' | 'agent'

export interface Bounty {
  id: string
  githubIssueUrl: string
  issueTitle: string
  amountMUSDC: number
  status: BountyStatus
  creatorWallet: string
  createdAt: Date
  prUrl?: string
  solverWallet?: string
  solverName?: string
  solverType?: SolverType
  submittedAt?: Date
  verdict?: 'approved' | 'rejected'
  genLayerReasoning?: string
  genLayerTxHash?: string
  evaluatedAt?: Date
}

export interface CreateBountyInput {
  githubIssueUrl: string
  amountMUSDC: number
}

export interface SubmitPRInput {
  bountyId: string
  prUrl: string
  solverWallet: string
  solverType?: SolverType
  solverName?: string
}

export interface Agent {
  id: string
  name: string
  status: AgentStatus
  specialty: string
  solvedBounties: number
  earningsMUSDC: number
  lastActivityTime: Date
  currentTask?: string
}

export interface ActivityFeedItem {
  id: string
  type: 'submission' | 'evaluation' | 'completion' | 'payment'
  agentName: string
  message: string
  timestamp: Date
}

