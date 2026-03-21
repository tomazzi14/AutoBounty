'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, GitPullRequest, CheckCircle2, Cpu, DollarSign } from 'lucide-react'

const terminalLines = [
  { delay: 0,    text: '$ autobounty create --issue https://github.com/org/repo/issues/42 --amount 100', type: 'cmd' },
  { delay: 900,  text: '> Connecting wallet 0x1234...abcd', type: 'info' },
  { delay: 1600, text: '> Deploying escrow contract on Avalanche...', type: 'info' },
  { delay: 2500, text: '> Bounty #42 funded with 100 mUSDC', type: 'success' },
  { delay: 3300, text: '', type: 'spacer' },
  { delay: 3400, text: '$ autobounty submit --bounty 42 --pr https://github.com/org/repo/pull/99', type: 'cmd' },
  { delay: 4300, text: '> AI agent evaluating PR...', type: 'info' },
  { delay: 5200, text: '> GenLayer consensus: 3/3 validators approved', type: 'success' },
  { delay: 6100, text: '> Payment released: 100 mUSDC -> 0x9abc...ef01', type: 'success' },
]

function TerminalCard() {
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    const timers = terminalLines.map((line, i) =>
      setTimeout(() => setVisibleCount(i + 1), line.delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="w-full max-w-3xl mx-auto rounded-xl border border-white/8 bg-[var(--surface-1)] overflow-hidden shadow-2xl">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[var(--surface-2)]">
        <span className="w-3 h-3 rounded-full bg-red-500/60" />
        <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
        <span className="w-3 h-3 rounded-full bg-green-500/60" />
        <span className="ml-3 text-xs text-[var(--text-dimmer)] font-mono">autobounty — zsh</span>
      </div>
      {/* Body */}
      <div className="p-5 font-mono text-sm leading-relaxed min-h-[220px]">
        {terminalLines.slice(0, visibleCount).map((line, i) => {
          if (line.type === 'spacer') return <div key={i} className="h-2" />
          return (
            <div key={i} className={`flex items-start gap-2 ${line.type === 'cmd' ? 'text-white' : line.type === 'success' ? 'text-[var(--brand-teal)]' : 'text-[var(--text-dim)]'}`}>
              <span className="select-none shrink-0">
                {line.type === 'cmd' ? '' : '  '}
              </span>
              <span>{line.text}</span>
            </div>
          )
        })}
        {visibleCount < terminalLines.length && (
          <span className="inline-block w-2 h-4 bg-[var(--brand-teal)] animate-pulse ml-1" />
        )}
      </div>
    </div>
  )
}

const pills = [
  { icon: GitPullRequest, label: 'PR Verification' },
  { icon: Cpu,           label: 'AI Evaluation' },
  { icon: CheckCircle2,  label: 'GenLayer Consensus' },
  { icon: DollarSign,    label: 'Instant Payout' },
]

export default function HeroSection() {
  return (
    <section
      id="product"
      className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-16 overflow-hidden grid-bg noise"
    >
      {/* Glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full bg-[var(--brand-glow-teal)] blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] rounded-full bg-[var(--brand-glow-blue)] blur-[120px]" />
      </div>

      {/* Grid corner accents */}
      <div className="absolute top-20 left-6 w-4 h-4 border-t border-l border-white/10" />
      <div className="absolute top-20 right-6 w-4 h-4 border-t border-r border-white/10" />
      <div className="absolute bottom-6 left-6 w-4 h-4 border-b border-l border-white/10" />
      <div className="absolute bottom-6 right-6 w-4 h-4 border-b border-r border-white/10" />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 flex flex-col items-center gap-10">

        {/* Badge */}
        <div className="opacity-0 animate-fade-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--brand-teal)]/25 bg-[var(--brand-glow-teal)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-teal)] animate-pulse" />
          <span className="text-xs font-medium text-[var(--brand-teal)] tracking-widest uppercase font-mono">
            Now live on Avalanche
          </span>
        </div>

        {/* Headline */}
        <div className="opacity-0 animate-fade-up delay-100 text-center flex flex-col gap-4">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.06] tracking-tight text-balance">
            Automated bounties for<br />
            <span className="gradient-text text-glow-teal">open source.</span>
          </h1>
          <p className="text-lg text-[var(--text-dim)] leading-relaxed max-w-xl mx-auto text-pretty">
            AI agents verify GitHub contributions and release payments
            instantly through onchain escrow.
          </p>
        </div>

        {/* CTAs */}
        <div className="opacity-0 animate-fade-up delay-200 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--brand-teal)] text-black font-semibold text-sm hover:bg-[var(--brand-blue)] transition-all duration-200 glow-teal"
          >
            Launch App
            <ArrowRight size={15} />
          </a>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/10 text-white font-medium text-sm hover:border-[var(--brand-teal)]/30 hover:bg-white/5 transition-all duration-200"
          >
            How it works
          </a>
        </div>

        {/* Terminal */}
        <div className="opacity-0 animate-fade-up delay-300 w-full">
          <TerminalCard />
        </div>

        {/* Feature pills */}
        <div className="opacity-0 animate-fade-up delay-400 flex flex-wrap justify-center gap-3">
          {pills.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/7 bg-white/3 text-sm text-[var(--text-dim)] hover:border-[var(--brand-teal)]/25 hover:text-white transition-all duration-200"
            >
              <Icon size={13} className="text-[var(--brand-teal)] shrink-0" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
