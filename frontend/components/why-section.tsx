import { CheckCircle } from 'lucide-react'

const bullets = [
  { title: 'Remove manual bottlenecks', desc: 'Every review and payment step is automated end-to-end.' },
  { title: 'Create trustless contributor incentives', desc: 'Smart contract escrow means funds are guaranteed before work begins.' },
  { title: 'Reward faster shipping', desc: 'Developers who move fast get paid fast — no more waiting weeks.' },
  { title: 'Make open source bounties scalable', desc: 'Run hundreds of simultaneous bounties with zero operational overhead.' },
]

export default function WhySection() {
  return (
    <section className="py-28 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--brand-teal)]/30 bg-[var(--brand-glow-teal)] mb-6">
              <span className="text-xs font-medium text-[var(--brand-teal)] tracking-wide uppercase">
                Why AutoBounty
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-balance mb-6 tracking-tight leading-[1.1]">
              From pull request to{' '}
              <span className="gradient-text">payout in seconds</span>
            </h2>
            <p className="text-[var(--text-dim)] leading-relaxed">
              The first platform that brings AI evaluation and onchain execution
              together — making open source contributions as rewarding as they
              should be.
            </p>
          </div>

          {/* Right */}
          <div className="flex flex-col gap-4">
            {bullets.map(({ title, desc }) => (
              <div key={title} className="flex gap-4 glass rounded-xl p-5 hover:border-[var(--brand-teal)]/15 transition-all duration-200 group">
                <CheckCircle
                  size={20}
                  className="shrink-0 text-[var(--brand-teal)] mt-0.5"
                />
                <div>
                  <h4 className="font-semibold text-white mb-1 text-sm">{title}</h4>
                  <p className="text-sm text-[var(--text-dim)] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
