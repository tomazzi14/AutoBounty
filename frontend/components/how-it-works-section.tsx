import { Building2, User } from 'lucide-react'

const companySteps = [
  { num: '01', title: 'Post an issue with a bounty', desc: 'Define the scope, acceptance criteria, and reward for any GitHub issue.' },
  { num: '02', title: 'Deposit funds into escrow on Avalanche', desc: 'Lock AVAX into a smart contract. Funds are safe until contribution is verified.' },
  { num: '03', title: 'Define evaluation criteria', desc: 'Set quality thresholds, test coverage requirements, and code standards.' },
]

const devSteps = [
  { num: '01', title: 'Pick an issue', desc: 'Browse open bounties and claim the one that matches your skills.' },
  { num: '02', title: 'Submit a PR', desc: 'Push your code to GitHub and link it to the bounty issue.' },
  { num: '03', title: 'AI evaluates the contribution', desc: 'Multi-LLM agents analyze your code quality, tests, and compliance.' },
  { num: '04', title: 'Payment gets released automatically', desc: 'Smart contract releases funds directly to your wallet — no waiting.' },
]

function StepCard({ num, title, desc, isLast }: { num: string; title: string; desc: string; isLast: boolean }) {
  return (
    <div className="relative flex gap-4">
      {/* Vertical connector */}
      {!isLast && (
        <div className="absolute left-5 top-10 bottom-0 w-px bg-gradient-to-b from-[var(--brand-teal)]/40 to-transparent" />
      )}
      <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--brand-glow-teal)] border border-[var(--brand-teal)]/30 flex items-center justify-center z-10">
        <span className="text-xs font-mono font-bold text-[var(--brand-teal)]">{num}</span>
      </div>
      <div className="pb-8">
        <h4 className="font-semibold text-white mb-1">{title}</h4>
        <p className="text-sm text-[var(--text-dim)] leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-28 relative grid-bg">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-center mb-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-dim)] border border-white/10 rounded-full px-4 py-1.5">
            How it Works
          </span>
        </div>

        <h2 className="text-4xl md:text-5xl font-bold text-center text-balance mb-4 tracking-tight">
          A trustless journey{' '}
          <span className="gradient-text">from issue to payout</span>
        </h2>
        <p className="text-center text-[var(--text-dim)] max-w-xl mx-auto mb-16 leading-relaxed">
          Separate workflows for companies and developers — connected by
          AutoBounty's AI layer and onchain escrow.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Companies */}
          <div className="glass rounded-2xl p-8 border border-white/5">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded-lg bg-[var(--brand-glow-blue)] flex items-center justify-center">
                <Building2 size={18} className="text-[var(--brand-blue)]" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-blue)] mb-0.5">For Companies</div>
                <div className="text-white font-semibold">Post & Fund Bounties</div>
              </div>
            </div>
            <div className="flex flex-col">
              {companySteps.map((step, i) => (
                <StepCard key={step.num} {...step} isLast={i === companySteps.length - 1} />
              ))}
            </div>
          </div>

          {/* Developers */}
          <div className="glass rounded-2xl p-8 border border-[var(--brand-teal)]/10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded-lg bg-[var(--brand-glow-teal)] flex items-center justify-center">
                <User size={18} className="text-[var(--brand-teal)]" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-teal)] mb-0.5">For Developers</div>
                <div className="text-white font-semibold">Contribute & Earn</div>
              </div>
            </div>
            <div className="flex flex-col">
              {devSteps.map((step, i) => (
                <StepCard key={step.num} {...step} isLast={i === devSteps.length - 1} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
