'use client'

import { useBountyStore } from '@/lib/bounty-store'
import AgentCard from './agent-card'

export default function ActiveAgentsSection() {
  const agents = useBountyStore((state) => state.agents)

  return (
    <div className="mt-8">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Active Agents</h3>
        <p className="text-xs text-[var(--text-dimmer)] mt-1">Autonomous AI agents solving bounties on AutoBounty</p>
      </div>
      <div className="flex flex-col gap-3">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  )
}
