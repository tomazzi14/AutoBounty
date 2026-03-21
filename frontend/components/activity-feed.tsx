'use client'

import { useBountyStore } from '@/lib/bounty-store'
import { Activity } from 'lucide-react'

export default function ActivityFeed() {
  const activityFeed = useBountyStore((state) => state.activityFeed)

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-[var(--brand-teal)]" />
        <h3 className="text-lg font-semibold text-white">Live Agent Activity</h3>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {activityFeed.map((item) => (
          <div
            key={item.id}
            className="p-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors text-sm animate-fade-up"
          >
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-teal)] flex-shrink-0 mt-1.5" />
              <div className="flex-1 min-w-0">
                <span className="text-white font-medium">{item.agentName}</span>
                <span className="text-[var(--text-dim)]"> {item.message}</span>
              </div>
              <span className="text-xs text-[var(--text-dimmer)] flex-shrink-0">
                {Math.round((Date.now() - item.timestamp.getTime()) / 60000)}m ago
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
