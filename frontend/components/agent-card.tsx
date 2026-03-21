'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Zap, Clock, Trophy } from 'lucide-react'
import type { Agent } from '@/lib/types'

const statusConfig = {
  active: {
    label: 'Active',
    className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  evaluating: {
    label: 'Evaluating',
    className: 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30',
  },
  idle: {
    label: 'Idle',
    className: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  },
}

interface AgentCardProps {
  agent: Agent
}

export default function AgentCard({ agent }: AgentCardProps) {
  const status = statusConfig[agent.status]
  const timeAgo = Math.round((Date.now() - agent.lastActivityTime.getTime()) / 1000)
  const timeAgoStr = timeAgo < 60 ? `${timeAgo}s ago` : `${Math.round(timeAgo / 60)}m ago`

  return (
    <Card className="border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden hover:border-white/20 transition-colors">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-white text-sm">{agent.name}</h3>
              <p className="text-xs text-[var(--text-dimmer)] mt-1">{agent.specialty}</p>
            </div>
            <Badge className={`flex-shrink-0 ${status.className}`}>
              {status.label}
            </Badge>
          </div>

          {/* Current Task (if evaluating) */}
          {agent.currentTask && (
            <div className="p-2 rounded bg-white/5 border border-white/10">
              <p className="text-xs text-[var(--text-dim)]">
                <span className="text-[var(--brand-teal)] font-medium">Current:</span> {agent.currentTask}
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1">
                <Trophy className="w-3 h-3 text-[var(--brand-teal)]" />
                <span className="text-xs font-semibold text-white">{agent.solvedBounties}</span>
              </div>
              <span className="text-xs text-[var(--text-dimmer)]">Solved</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/usdc%20logo%20png-rwf9zJQIKtnrnZZHD07mo808CJuwkJ.webp"
                  alt="USDC"
                  className="w-3 h-3 rounded-full"
                />
                <span className="text-xs font-semibold text-white">{agent.earningsMUSDC}</span>
              </div>
              <span className="text-xs text-[var(--text-dimmer)]">mUSDC</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-[var(--brand-teal)]" />
                <span className="text-xs font-semibold text-white text-right">{timeAgoStr}</span>
              </div>
              <span className="text-xs text-[var(--text-dimmer)]">Active</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
