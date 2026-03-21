'use client'

import AgentCommandBlock from './agent-command-block'
import ActiveAgentsSection from './active-agents-section'
import ActivityFeed from './activity-feed'
import { Card } from '@/components/ui/card'

export default function AgentModeContent() {
  return (
    <div className="space-y-6">
      {/* Command Block */}
      <AgentCommandBlock />

      {/* Active Agents */}
      <ActiveAgentsSection />

      {/* Activity Feed — always below agents */}
      <Card className="border-white/10 bg-black/40 backdrop-blur-sm">
        <div className="p-4">
          <ActivityFeed />
        </div>
      </Card>
    </div>
  )
}
