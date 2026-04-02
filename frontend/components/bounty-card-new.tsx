'use client'

import { useState } from 'react'
import { ExternalLink, Loader2, GitPullRequest, Clock, CheckCircle, XCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useAccount } from 'wagmi'
import { useBountyStore } from '@/lib/bounty-store'
import type { Bounty } from '@/lib/types'

const statusMap = {
  open: {
    label: 'Open',
    className: 'border-[var(--brand-teal)]/30 bg-[var(--brand-glow-teal)] text-[var(--brand-teal)]',
    Icon: Clock,
  },
  submitted: {
    label: 'Submitted',
    className: 'border-[var(--brand-blue)]/30 bg-[var(--brand-glow-blue)] text-[var(--brand-blue)]',
    Icon: GitPullRequest,
  },
  evaluating: {
    label: 'Evaluating...',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    Icon: Loader2,
  },
  approved: {
    label: 'Approved',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    Icon: CheckCircle,
  },
  rejected: {
    label: 'Rejected',
    className: 'border-red-500/30 bg-red-500/10 text-red-400',
    Icon: XCircle,
  },
}

interface BountyCardProps {
  bounty: Bounty
}

export default function BountyCard({ bounty }: BountyCardProps) {
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [prUrl, setPrUrl] = useState('')
  const { address } = useAccount()

  const { submitPR, isSubmitting, isEvaluating } = useBountyStore()

  const status = statusMap[bounty.status]
  const StatusIcon = status.Icon
  const isThisEvaluating = isEvaluating === bounty.id

  const isValidPrUrl = prUrl.match(/github\.com\/[^/]+\/[^/]+\/pull\/\d+/)
  const canSubmit = isValidPrUrl && !isSubmitting && address

  const handleSubmitPR = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    await submitPR({
      bountyId: bounty.id,
      prUrl,
      solverWallet: address!,
    })
    setPrUrl('')
    setShowSubmitForm(false)
  }

  return (
    <Card className="border-white/8 bg-black/30 backdrop-blur-sm hover:border-white/15 transition-all duration-200">
      <CardContent className="p-5 flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <a
              href={bounty.githubIssueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-white hover:text-[var(--brand-teal)] transition-colors flex items-center gap-1.5 group"
            >
              <span className="truncate">{bounty.issueTitle}</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-[var(--text-dimmer)] font-mono">
                {bounty.solverType === 'agent' && bounty.solverName
                  ? <span className="text-[var(--brand-blue)]">Agent: {bounty.solverName}</span>
                  : <span>{bounty.creatorWallet}</span>
                }
              </p>
            </div>
          </div>
          <Badge variant="outline" className={`flex-shrink-0 ${status.className}`}>
            <StatusIcon className={`w-3 h-3 mr-1 ${isThisEvaluating ? 'animate-spin' : ''}`} />
            {isThisEvaluating ? 'Evaluating...' : status.label}
          </Badge>
        </div>

        {/* Amount */}
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-[var(--brand-teal)]">
            {bounty.amountMUSDC}
          </span>
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/usdc%20logo%20png-rwf9zJQIKtnrnZZHD07mo808CJuwkJ.webp"
            alt="USDC"
            className="w-5 h-5 rounded-full"
          />
          <span className="text-sm text-[var(--text-dim)]">mUSDC</span>
        </div>

        {/* PR info */}
        {bounty.prUrl && (
          <a
            href={bounty.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-[var(--brand-blue)] hover:underline font-mono"
          >
            <GitPullRequest className="w-3 h-3" />
            {bounty.prUrl}
          </a>
        )}

        {/* Evaluating — show GenLayer tx link */}
        {bounty.status === 'evaluating' && bounty.genLayerTxHash && (
          <div className="rounded-lg p-3 border border-white/10 bg-white/5 text-xs">
            <div className="flex items-center gap-1.5 mb-1.5 font-semibold text-[var(--brand-teal)]">
              <Sparkles className="w-3 h-3 animate-pulse" />
              GenLayer evaluating...
            </div>
            <a
              href={`https://explorer-bradbury.genlayer.com/tx/${bounty.genLayerTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[var(--text-dim)] hover:text-white transition-colors break-all"
            >
              {bounty.genLayerTxHash.slice(0, 16)}…{bounty.genLayerTxHash.slice(-8)} ↗
            </a>
          </div>
        )}

        {/* Verdict */}
        {bounty.verdict && bounty.genLayerReasoning && (
          <div className={`rounded-lg p-3 border text-xs leading-relaxed ${
            bounty.verdict === 'approved'
              ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'
              : 'border-red-500/20 bg-red-500/5 text-red-300'
          }`}>
            <div className="flex items-center gap-1.5 mb-1.5 font-semibold">
              <Sparkles className="w-3 h-3" />
              GenLayer AI Verdict
              {bounty.genLayerTxHash && (
                <a
                  href={`https://explorer-bradbury.genlayer.com/tx/${bounty.genLayerTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto font-mono text-[var(--text-dimmer)] hover:text-white transition-colors"
                >
                  tx ↗
                </a>
              )}
            </div>
            <p className="text-[var(--text-dim)] leading-relaxed">{bounty.genLayerReasoning}</p>
          </div>
        )}

        {/* Submit PR button */}
        {bounty.status === 'open' && !showSubmitForm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSubmitForm(true)}
            className="w-full border-white/10 bg-white/5 text-white hover:bg-[var(--brand-glow-teal)] hover:border-[var(--brand-teal)]/30 hover:text-[var(--brand-teal)]"
          >
            <GitPullRequest className="w-4 h-4 mr-2" />
            Submit PR
          </Button>
        )}

        {/* Submit PR form */}
        {showSubmitForm && (
          <form onSubmit={handleSubmitPR} className="flex flex-col gap-3">
            <div className="relative">
              <GitPullRequest className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-dimmer)]" />
              <Input
                type="url"
                placeholder="https://github.com/owner/repo/pull/99"
                value={prUrl}
                onChange={(e) => setPrUrl(e.target.value)}
                className="pl-10 border-white/10 bg-white/5 text-white placeholder:text-[var(--text-dimmer)] focus:border-[var(--brand-teal)]/50"
              />
            </div>
            {prUrl && !isValidPrUrl && (
              <p className="text-xs text-red-400">Please enter a valid GitHub PR URL</p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setShowSubmitForm(false); setPrUrl('') }}
                className="flex-1 border-white/10 bg-white/5 text-[var(--text-dim)] hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!canSubmit}
                className="flex-1 bg-[var(--brand-teal)] text-black font-semibold hover:bg-[var(--brand-blue)] disabled:opacity-50"
              >
                {isSubmitting
                  ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Submitting...</>
                  : 'Submit'
                }
              </Button>
            </div>
          </form>
        )}

      </CardContent>
    </Card>
  )
}
