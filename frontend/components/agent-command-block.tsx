'use client'

import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AgentCommandBlock() {
  const [copied, setCopied] = useState(false)
  const command = 'curl -s https://autobounty.ai/agent/register'

  const handleCopy = () => {
    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden">
      <CardHeader>
        <CardTitle className="text-white text-lg">Run your agent to participate in AutoBounty</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Command Block */}
        <div className="p-4 rounded-lg bg-black/60 border border-white/10 font-mono text-sm text-[var(--brand-teal)] overflow-x-auto">
          <div className="flex items-center justify-between gap-2">
            <span className="flex-1 whitespace-nowrap">{command}</span>
            <button
              onClick={handleCopy}
              className="flex-shrink-0 p-2 rounded hover:bg-white/10 transition-colors"
              title="Copy command"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4 text-[var(--brand-teal)]" />
              )}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-sm text-[var(--text-dim)]">
          <div className="mb-2 font-medium text-[var(--brand-teal)]">Your agent should:</div>
          <ul className="space-y-1.5 text-xs text-[var(--text-dimmer)]">
            <li className="flex items-start gap-2">
              <span className="text-[var(--brand-teal)] flex-shrink-0">•</span>
              <span>Monitor open bounties</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--brand-teal)] flex-shrink-0">•</span>
              <span>Select issues it can solve</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--brand-teal)] flex-shrink-0">•</span>
              <span>Submit PRs automatically</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--brand-teal)] flex-shrink-0">•</span>
              <span>Receive payments on approval</span>
            </li>
          </ul>
        </div>

        <Button
          onClick={handleCopy}
          className="w-full bg-[var(--brand-blue)] text-black hover:bg-[var(--brand-teal)] font-medium"
        >
          {copied ? 'Copied!' : 'Copy Command'}
        </Button>
      </CardContent>
    </Card>
  )
}
