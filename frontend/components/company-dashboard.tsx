'use client'

import { useState } from 'react'
import { Plus, Loader2, Wallet, Github, Building2, Bot, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useBountyStore } from '@/lib/bounty-store'
import BountyList from './bounty-list'
import AgentModeContent from './agent-mode-content'

export default function CompanyDashboard() {
  const [githubUrl, setGithubUrl] = useState('')
  const [amount, setAmount] = useState('')
  const { address, isConnected: walletConnected } = useAccount()
  const [solverMode, setSolverMode] = useState<'human' | 'agent'>('human')

  const { createBounty, isCreating } = useBountyStore()

  const isValidGithubUrl = githubUrl.match(/github\.com\/[^/]+\/[^/]+\/issues\/\d+/)
  const isValidAmount = Number(amount) > 0
  const canSubmit = walletConnected && isValidGithubUrl && isValidAmount && !isCreating

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || !address) return
    await createBounty({ githubIssueUrl: githubUrl, amountMUSDC: Number(amount) }, address)
    setGithubUrl('')
    setAmount('')
  }

  return (
    <div className="grid lg:grid-cols-[400px_1fr] gap-8">
      {/* Left Column */}
      <div className="lg:sticky lg:top-32 lg:self-start flex flex-col gap-4">

        {/* Creator Mode Toggle */}
        <Card className="border-white/10 bg-black/40 backdrop-blur-sm">
          <CardContent className="p-4">
            <p className="text-xs text-[var(--text-dim)] mb-3 font-medium uppercase tracking-wide">How do you create bounties?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setSolverMode('human')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
                  solverMode === 'human'
                    ? 'border-[var(--brand-teal)]/40 bg-[var(--brand-glow-teal)] text-[var(--brand-teal)]'
                    : 'border-white/10 bg-white/3 text-[var(--text-dim)] hover:border-white/20 hover:text-white'
                }`}
              >
                <User className="w-4 h-4" />
                Manually
              </button>
              <button
                onClick={() => setSolverMode('agent')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
                  solverMode === 'agent'
                    ? 'border-[var(--brand-teal)]/40 bg-[var(--brand-glow-teal)] text-[var(--brand-teal)]'
                    : 'border-white/10 bg-white/3 text-[var(--text-dim)] hover:border-white/20 hover:text-white'
                }`}
              >
                <Bot className="w-4 h-4" />
                Via Agent
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Create Bounty Form */}
        <Card className="border-white/10 bg-black/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Plus className="w-5 h-5 text-[var(--brand-teal)]" />
              Create Bounty
            </CardTitle>
            <CardDescription className="text-[var(--text-dim)]">
              {solverMode === 'human'
                ? 'You create bounties manually via this form'
                : 'Your company agent creates bounties automatically'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Wallet */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[var(--text-dim)]">Wallet</label>
                {walletConnected ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--brand-teal)]/30 bg-[var(--brand-glow-teal)]">
                    <Wallet className="w-4 h-4 text-[var(--brand-teal)]" />
                    <span className="text-sm font-mono text-[var(--brand-teal)]">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                    <span className="ml-auto text-xs text-[var(--brand-teal)]">Connected</span>
                  </div>
                ) : (
                  <ConnectButton.Custom>
                    {({ openConnectModal }) => (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={openConnectModal}
                        className="w-full border-white/10 bg-white/5 text-white hover:bg-[var(--brand-glow-teal)] hover:border-[var(--brand-teal)]/30 hover:text-[var(--brand-teal)]"
                      >
                        <Wallet className="w-4 h-4 mr-2" />
                        Connect Wallet
                      </Button>
                    )}
                  </ConnectButton.Custom>
                )}
              </div>

              {/* GitHub Issue URL */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[var(--text-dim)]">GitHub Issue URL</label>
                <div className="relative">
                  <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-dimmer)]" />
                  <Input
                    type="url"
                    placeholder="https://github.com/owner/repo/issues/123"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="pl-10 border-white/10 bg-white/5 text-white placeholder:text-[var(--text-dimmer)] focus:border-[var(--brand-teal)]/50"
                  />
                </div>
                {githubUrl && !isValidGithubUrl && (
                  <p className="text-xs text-red-400">Please enter a valid GitHub issue URL</p>
                )}
              </div>

              {/* Amount */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[var(--text-dim)] flex items-center gap-1.5">
                  Bounty Amount
                  <img
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/usdc%20logo%20png-rwf9zJQIKtnrnZZHD07mo808CJuwkJ.webp"
                    alt="USDC"
                    className="w-4 h-4 rounded-full"
                  />
                  <span>mUSDC</span>
                </label>
                <div className="relative">
                  <img
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/usdc%20logo%20png-rwf9zJQIKtnrnZZHD07mo808CJuwkJ.webp"
                    alt="USDC"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full"
                  />
                  <Input
                    type="number"
                    placeholder="100"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-10 border-white/10 bg-white/5 text-white placeholder:text-[var(--text-dimmer)] focus:border-[var(--brand-teal)]/50"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={!canSubmit}
                className="w-full bg-[var(--brand-teal)] text-black font-semibold hover:bg-[var(--brand-blue)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Bounty...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Bounty
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="flex flex-col gap-6">
        {solverMode === 'agent' && <AgentModeContent />}
        <BountyList />
      </div>
    </div>
  )
}
