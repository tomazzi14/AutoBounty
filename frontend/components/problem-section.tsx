import { Clock, HelpCircle, Wrench, Frown } from 'lucide-react'

const problems = [
  {
    icon: Clock,
    title: 'Slow PR Reviews',
    desc: 'Bounty-based issues sit for days or weeks with no feedback loop for contributors.',
  },
  {
    icon: HelpCircle,
    title: 'Uncertain Rewards',
    desc: "Developers submit work without knowing if or when they'll actually get paid.",
  },
  {
    icon: Wrench,
    title: 'Manual Validation',
    desc: 'Maintainers spend hours reviewing and approving contributions manually.',
  },
  {
    icon: Frown,
    title: 'Bad Dev Experience',
    desc: 'Complex, opaque processes drive talented contributors away from open source.',
  },
]

export default function ProblemSection() {
  return (
    <section id="problem" className="py-28 relative">
      <div className="max-w-7xl mx-auto px-6">
        {/* Label */}
        <div className="flex justify-center mb-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-dim)] border border-white/10 rounded-full px-4 py-1.5">
            The Problem
          </span>
        </div>

        <h2 className="text-4xl md:text-5xl font-bold text-center text-balance mb-4 tracking-tight">
          Open source bounties are{' '}
          <span className="gradient-text">still painfully manual</span>
        </h2>
        <p className="text-center text-[var(--text-dim)] max-w-xl mx-auto mb-16 leading-relaxed">
          The current bounty ecosystem is broken — slow, uncertain, and deeply
          frustrating for developers and maintainers alike.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {problems.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="glass rounded-xl p-6 flex flex-col gap-4 hover:border-white/12 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-[var(--brand-glow-teal)] transition-colors duration-200">
                <Icon size={18} className="text-[var(--text-dim)] group-hover:text-[var(--brand-teal)] transition-colors duration-200" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1.5">{title}</h3>
                <p className="text-sm text-[var(--text-dim)] leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
