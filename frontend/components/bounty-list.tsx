'use client'

import { useState } from 'react'
import { useBountyStore } from '@/lib/bounty-store'
import BountyCard from './bounty-card-new'
import { FileText } from 'lucide-react'

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
] as const

type FilterValue = typeof FILTERS[number]['value']

interface BountyListProps {
  showOnlyOpen?: boolean
}

export default function BountyList({ showOnlyOpen = false }: BountyListProps) {
  const { bounties } = useBountyStore()
  const [filter, setFilter] = useState<FilterValue>(showOnlyOpen ? 'open' : 'all')

  const filteredBounties = filter === 'all'
    ? bounties
    : bounties.filter(b => b.status === filter)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Bounties</h2>
        <span className="text-sm text-[var(--text-dim)]">{filteredBounties.length} of {bounties.length}</span>
      </div>

      <div className="flex gap-2">
        {FILTERS.map((f) => {
          const count = f.value === 'all'
            ? bounties.length
            : bounties.filter(b => b.status === f.value).length
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f.value
                  ? 'bg-[var(--accent)] text-black'
                  : 'bg-white/5 text-[var(--text-dim)] hover:bg-white/10 hover:text-white'
              }`}
            >
              {f.label} ({count})
            </button>
          )
        })}
      </div>

      {filteredBounties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-[var(--text-dimmer)]" />
          </div>
          <h3 className="text-lg font-medium text-white mb-1">No {filter} bounties</h3>
          <p className="text-sm text-[var(--text-dim)] max-w-sm">
            {filter === 'open'
              ? 'Create your first bounty by pasting a GitHub issue URL and setting an amount.'
              : `No bounties with status "${filter}" found.`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredBounties.map((bounty) => (
            <BountyCard key={bounty.id} bounty={bounty} />
          ))}
        </div>
      )}
    </div>
  )
}
