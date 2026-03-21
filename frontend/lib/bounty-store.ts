import { create } from 'zustand'
import type { Bounty, CreateBountyInput, SubmitPRInput, Agent, ActivityFeedItem } from './types'

// Mock AI evaluation responses
const mockEvaluationResponses = [
  {
    verdict: 'approved' as const,
    reasoning: 'The PR successfully implements all requirements specified in the issue. Code quality is excellent with proper error handling, tests included, and documentation updated. The solution follows project conventions and best practices.',
  },
  {
    verdict: 'approved' as const,
    reasoning: 'GenLayer consensus reached: 3/3 validators approved. The implementation correctly addresses the issue requirements with clean, maintainable code. All edge cases are handled appropriately.',
  },
  {
    verdict: 'rejected' as const,
    reasoning: 'The PR does not fully address the issue requirements. Missing implementation for edge cases mentioned in the issue description. Tests are incomplete and documentation was not updated.',
  },
  {
    verdict: 'approved' as const,
    reasoning: 'Validator consensus achieved. The contribution meets all acceptance criteria. Code is well-structured, properly typed, and includes comprehensive test coverage.',
  },
]

// Mock agents
const mockAgents: Agent[] = [
  {
    id: 'agent-1',
    name: 'AutoDev-01',
    status: 'active',
    specialty: 'Frontend / React',
    solvedBounties: 12,
    earningsMUSDC: 240,
    lastActivityTime: new Date(Date.now() - 2 * 60000), // 2 min ago
  },
  {
    id: 'agent-2',
    name: 'BugHunter-X',
    status: 'evaluating',
    specialty: 'Backend / APIs',
    solvedBounties: 7,
    earningsMUSDC: 130,
    currentTask: 'Evaluating PR #182',
    lastActivityTime: new Date(Date.now() - 30000), // 30 sec ago
  },
  {
    id: 'agent-3',
    name: 'RefactorBot',
    status: 'idle',
    specialty: 'Code Quality',
    solvedBounties: 3,
    earningsMUSDC: 45,
    lastActivityTime: new Date(Date.now() - 15 * 60000), // 15 min ago
  },
  {
    id: 'agent-4',
    name: 'SecurityAI',
    status: 'active',
    specialty: 'Security / DevOps',
    solvedBounties: 8,
    earningsMUSDC: 180,
    lastActivityTime: new Date(Date.now() - 1 * 60000), // 1 min ago
  },
]

// Mock activity feed
const mockActivityFeed: ActivityFeedItem[] = [
  {
    id: 'activity-1',
    type: 'submission',
    agentName: 'AutoDev-01',
    message: 'submitted PR for issue #42',
    timestamp: new Date(Date.now() - 5 * 60000),
  },
  {
    id: 'activity-2',
    type: 'evaluation',
    agentName: 'BugHunter-X',
    message: 'is evaluating a bounty...',
    timestamp: new Date(Date.now() - 2 * 60000),
  },
  {
    id: 'activity-3',
    type: 'completion',
    agentName: 'RefactorBot',
    message: 'completed a refactor task',
    timestamp: new Date(Date.now() - 10 * 60000),
  },
  {
    id: 'activity-4',
    type: 'payment',
    agentName: 'AutoDev-01',
    message: 'received payment of 25 mUSDC',
    timestamp: new Date(Date.now() - 15 * 60000),
  },
]

// Extract issue title from GitHub URL (mock)
function extractIssueTitle(url: string): string {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/)
  if (match) {
    return `${match[1]}/${match[2]} #${match[3]}`
  }
  return 'GitHub Issue'
}

interface BountyStore {
  bounties: Bounty[]
  agents: Agent[]
  activityFeed: ActivityFeedItem[]
  isCreating: boolean
  isSubmitting: boolean
  isEvaluating: string | null // bountyId being evaluated
  
  createBounty: (input: CreateBountyInput, creatorWallet: string) => Promise<void>
  submitPR: (input: SubmitPRInput) => Promise<void>
  evaluateBounty: (bountyId: string) => Promise<void>
  getAgents: () => Agent[]
  getActivityFeed: () => ActivityFeedItem[]
}

export const useBountyStore = create<BountyStore>((set, get) => ({
  bounties: [],
  agents: mockAgents,
  activityFeed: mockActivityFeed,
  isCreating: false,
  isSubmitting: false,
  isEvaluating: null,

  createBounty: async (input, creatorWallet) => {
    set({ isCreating: true })
    
    // Simulate blockchain transaction delay
    await new Promise((resolve) => setTimeout(resolve, 1500))
    
    const newBounty: Bounty = {
      id: `bounty-${Date.now()}`,
      githubIssueUrl: input.githubIssueUrl,
      issueTitle: extractIssueTitle(input.githubIssueUrl),
      amountMUSDC: input.amountMUSDC,
      status: 'open',
      creatorWallet,
      createdAt: new Date(),
      solverType: 'human',
    }
    
    set((state) => ({
      bounties: [newBounty, ...state.bounties],
      isCreating: false,
    }))
  },

  submitPR: async (input) => {
    set({ isSubmitting: true })
    
    // Simulate transaction delay
    await new Promise((resolve) => setTimeout(resolve, 1000))
    
    set((state) => ({
      bounties: state.bounties.map((b) =>
        b.id === input.bountyId
          ? {
              ...b,
              status: 'submitted' as const,
              prUrl: input.prUrl,
              solverWallet: input.solverWallet,
              solverType: input.solverType || 'human',
              solverName: input.solverName,
              submittedAt: new Date(),
            }
          : b
      ),
      isSubmitting: false,
    }))
    
    // Auto-trigger evaluation after submission
    setTimeout(() => {
      get().evaluateBounty(input.bountyId)
    }, 500)
  },

  evaluateBounty: async (bountyId) => {
    set({ isEvaluating: bountyId })
    
    // Update status to evaluating
    set((state) => ({
      bounties: state.bounties.map((b) =>
        b.id === bountyId ? { ...b, status: 'evaluating' as const } : b
      ),
    }))
    
    // Simulate AI evaluation delay (2-3 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 1000))
    
    // Pick a random evaluation response
    const evaluation = mockEvaluationResponses[Math.floor(Math.random() * mockEvaluationResponses.length)]
    
    set((state) => ({
      bounties: state.bounties.map((b) =>
        b.id === bountyId
          ? {
              ...b,
              status: evaluation.verdict,
              verdict: evaluation.verdict,
              genLayerReasoning: evaluation.reasoning,
              evaluatedAt: new Date(),
            }
          : b
      ),
      isEvaluating: null,
    }))
  },

  getAgents: () => get().agents,
  getActivityFeed: () => get().activityFeed,
}))

