const techStack = [
  {
    name: 'Solidity',
    category: 'Smart Contracts',
    logo: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/solidity-DGxi10Z5RaMCWGNrBWpLMPN09RRBXZ.png',
  },
  {
    name: 'Avalanche',
    category: 'Blockchain',
    logo: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/avalanche-pOjkr5EOuiUnpu8OnJ89yJjiORpBHb.png',
  },
  {
    name: 'wagmi',
    category: 'Web3 Hooks',
    logo: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/wagmi-7YvEaEu7zgrMmyV8HYfjqgekZdK8Tp.png',
  },
  {
    name: 'GenLayer',
    category: 'AI Evaluation',
    logo: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/genlayer-ycPmLKG6ObBK45QkyrRGmkF18gmJYu.png',
  },
  {
    name: 'GitHub API',
    category: 'Integration',
    logo: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/github-ncV08qJelTr3JOHWNwiCDFV6kJQmm2.png',
  },
]

export default function TechStackSection() {
  return (
    <section id="tech-stack" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-[var(--text-dimmer)] mb-10">
          OUR TECH STACK
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          {techStack.map(({ name, category, logo }) => (
            <div
              key={name}
              className="glass rounded-xl px-6 py-4 flex flex-col items-center gap-3 hover:border-[var(--brand-teal)]/20 hover:bg-[var(--brand-glow-teal)] transition-all duration-200 group cursor-default min-w-[120px]"
            >
              <img
                src={logo}
                alt={name}
                className="h-7 w-auto object-contain opacity-60 group-hover:opacity-100 transition-opacity duration-200"
              />
              <div className="flex flex-col items-center gap-0.5">
                <span className="font-semibold text-white text-sm group-hover:text-[var(--brand-teal)] transition-colors duration-200">
                  {name}
                </span>
                <span className="text-[10px] font-mono text-[var(--text-dimmer)] uppercase tracking-wide">
                  {category}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
