'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, Users } from 'lucide-react'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'

export default function CtaSection() {
  const { openConnectModal } = useConnectModal()
  const { isConnected } = useAccount()
  const router = useRouter()

  const handleLaunchApp = () => {
    if (isConnected) {
      router.push('/dashboard')
    } else {
      openConnectModal?.()
    }
  }

  return (
    <section id="cta" className="py-32 relative overflow-hidden">
      {/* Glow backdrop */}
      <div className="absolute inset-0 pointer-events-none cta-gradient" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full bg-[var(--brand-glow-teal)] blur-[160px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full bg-[var(--brand-glow-blue)] blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--brand-teal)]/30 bg-[var(--brand-glow-teal)] mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-teal)] animate-pulse" />
          <span className="text-xs font-medium text-[var(--brand-teal)] tracking-wide uppercase">
            Testnet live now
          </span>
        </div>

        <h2 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight text-balance leading-[1.08]">
          Join{' '}
          <span className="gradient-text">AutoBounty</span>
        </h2>

        <p className="text-lg text-[var(--text-dim)] leading-relaxed mb-10 max-w-xl mx-auto">
          Join the future of open source collaboration. Post bounties, earn
          rewards, and let AI handle the rest.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={handleLaunchApp}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[var(--brand-teal)] text-black font-semibold text-base hover:bg-[var(--brand-blue)] transition-all duration-200 glow-teal cursor-pointer"
          >
            Join as a Company
            <ArrowRight size={18} />
          </button>
          <button
            onClick={handleLaunchApp}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-white/15 text-white font-semibold text-base hover:border-white/25 hover:bg-white/5 transition-all duration-200 cursor-pointer"
          >
            <Users size={18} className="text-[var(--brand-teal)]" />
            Join as a Dev
          </button>
        </div>
      </div>
    </section>
  )
}
