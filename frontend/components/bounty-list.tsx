'use client'

import { useBountyStore } from '@/lib/bounty-store'
import BountyCard from './bounty-card-new'
import { FileText } from 'lucide-react'

interface BountyListProps {
  showOnlyOpen?: boolean
}

export default function BountyList({ showOnlyOpen = false }: BountyListProps) {
  const { bounties } = useBountyStore()
  
  const filteredBounties = showOnlyOpen 
    ? bounties.filter(b => b.status === 'open')
    : bounties

  if (filteredBounties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-[var(--text-dimmer)]" />
        </div>
        <h3 className="text-lg font-medium text-white mb-1">No bounties yet</h3>
        <p className="text-sm text-[var(--text-dim)] max-w-sm">
          Create your first bounty by pasting a GitHub issue URL and setting an amount.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          {showOnlyOpen ? 'Open Bounties' : 'Active Bounties'}
        </h2>
        <span className="text-sm text-[var(--text-dim)]">{filteredBounties.length} total</span>
      </div>
      <div className="flex flex-col gap-3">
        {filteredBounties.map((bounty) => (
          <BountyCard key={bounty.id} bounty={bounty} />
        ))}
      </div>
    </div>
  )
}
