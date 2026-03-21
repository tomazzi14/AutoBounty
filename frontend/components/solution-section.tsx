import { Bot, Lock, Zap, Eye } from 'lucide-react'

const features = [
  {
    icon: Bot,
    title: 'AI Evaluation',
    desc: 'Multi-LLM agents analyze pull requests and contribution quality with deep code understanding.',
    tag: 'LLM-powered',
  },
  {
    icon: Lock,
    title: 'Onchain Escrow',
    desc: 'Lock USDC in smart contracts before work begins — no trust required.',
    tag: 'Avalanche',
  },
  {
    icon: Zap,
    title: 'Instant Payouts',
    desc: 'Payments are released automatically once contributions are approved by AI validators.',
    tag: 'Sub-second',
  },
  {
    icon: Eye,
    title: 'Transparent by Default',
    desc: 'Every evaluation step, escrow movement, and payout is verifiable onchain.',
    tag: 'Open',
  },
]

export default function SolutionSection() {
  return (
    <section id="developers" className="py-28 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-[var(--brand-glow-teal)] blur-[150px] opacity-50" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="flex justify-center mb-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-teal)] border border-[var(--brand-teal)]/30 rounded-full px-4 py-1.5">
            The Solution
          </span>
        </div>

        <h2 className="text-4xl md:text-5xl font-bold text-center text-balance mb-4 tracking-tight">
          Automatic verification.{' '}
          <span className="gradient-text">Instant reward.</span>
        </h2>
        <p className="text-center text-[var(--text-dim)] max-w-xl mx-auto mb-16 leading-relaxed">
          AutoBounty replaces every manual step with trustless, AI-powered
          automation.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          {features.map(({ icon: Icon, title, desc, tag }) => (
            <div
              key={title}
              className="glass rounded-xl p-8 flex gap-5 group hover:border-[var(--brand-teal)]/20 transition-all duration-300"
            >
              <div className="shrink-0 w-12 h-12 rounded-xl bg-[var(--brand-glow-teal)] flex items-center justify-center group-hover:glow-teal transition-all duration-200">
                <Icon size={22} className="text-[var(--brand-teal)]" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white text-lg">{title}</h3>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-white/5 text-[var(--text-dim)] uppercase tracking-wide">
                    {tag}
                  </span>
                </div>
                <p className="text-[var(--text-dim)] leading-relaxed text-sm">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
