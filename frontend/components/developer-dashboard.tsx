'use client'

import { useState, useEffect } from 'react'
import { User, Bot } from 'lucide-react'
import BountyList from './bounty-list'
import AgentModeContent from './agent-mode-content'
import { Card } from '@/components/ui/card'
import { useBountyStore } from '@/lib/bounty-store'

export default function DeveloperDashboard() {
  const [solverType, setSolverType] = useState<'human' | 'agent'>('human')
  const { fetchBounties } = useBountyStore()

  useEffect(() => { fetchBounties() }, [fetchBounties])

  return (
    <div className="space-y-6">
      {/* Solver Type Toggle */}
      <Card className="border-white/10 bg-black/40 backdrop-blur-sm p-4">
        <p className="text-xs text-[var(--text-dim)] mb-3 font-medium uppercase tracking-wide">How do you solve bounties?</p>
        <div className="flex gap-2">
          <button
            onClick={() => setSolverType('human')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 border ${
              solverType === 'human'
                ? 'border-[var(--brand-teal)]/40 bg-[var(--brand-glow-teal)] text-[var(--brand-teal)]'
                : 'border-white/10 bg-white/3 text-[var(--text-dim)] hover:border-white/20 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            Manually
          </button>
          <button
            onClick={() => setSolverType('agent')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 border ${
              solverType === 'agent'
                ? 'border-[var(--brand-teal)]/40 bg-[var(--brand-glow-teal)] text-[var(--brand-teal)]'
                : 'border-white/10 bg-white/3 text-[var(--text-dim)] hover:border-white/20 hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4" />
            Via Agent
          </button>
        </div>
      </Card>

      {solverType === 'agent' ? (
        <AgentModeContent />
      ) : (
        <div className="grid lg:grid-cols-1 gap-6">
          <Card className="border-white/10 bg-black/40 backdrop-blur-sm p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white">Available Bounties</h3>
              <p className="text-sm text-[var(--text-dim)]">You browse and submit PRs manually to earn rewards</p>
            </div>
            <BountyList showOnlyOpen />
          </Card>
        </div>
      )}
    </div>
  )
}
