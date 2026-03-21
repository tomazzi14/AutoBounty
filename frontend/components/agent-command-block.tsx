'use client'

import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AgentCommandBlock() {
  const [copied, setCopied] = useState(false)
  const command = '/solve-bounty bountyId=3 issueUrl=https://github.com/tomazzi14/github-genlayer/issues/1 solverAddress=0x5ba6C6F599C74476d335B7Ad34C97F9c842e8734'

  const handleCopy = () => {
    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden">
      <CardHeader>
        <CardTitle className="text-white text-lg">Run the AI agent in Claude Code</CardTitle>
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
          <div className="mb-2 font-medium text-[var(--brand-teal)]">The agent will autonomously:</div>
          <ul className="space-y-1.5 text-xs text-[var(--text-dimmer)]">
            <li className="flex items-start gap-2">
              <span className="text-[var(--brand-teal)] flex-shrink-0">1.</span>
              <span>Read the GitHub issue and understand requirements</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--brand-teal)] flex-shrink-0">2.</span>
              <span>Write the code fix and create a Pull Request</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--brand-teal)] flex-shrink-0">3.</span>
              <span>Submit PR to GenLayer for AI consensus evaluation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--brand-teal)] flex-shrink-0">4.</span>
              <span>Receive mUSDC payout if approved by 5 validators</span>
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
