import Image from 'next/image'
import { Github } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <Image
              src="/autobounty-logo.svg"
              alt="AutoBounty"
              width={120}
              height={16}
            />
            <p className="text-xs text-[var(--text-dimmer)] font-mono">
              Built on Avalanche
            </p>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6">
            {[
              { label: 'GitHub', href: '#', icon: Github },
              { label: 'X', href: '#', render: () => (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.07-6.62-5.848 6.62H2.88l7.773-8.835L1.31 2.25h6.82l4.56 6.037L17.77 2.25h.474zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              )},
            ].map(({ label, href, icon: Icon, render }) => (
              <a
                key={label}
                href={href}
                className="flex items-center gap-1.5 text-sm text-[var(--text-dim)] hover:text-white transition-colors duration-200"
              >
                {render ? render() : <Icon size={14} />}
                {label}
              </a>
            ))}
          </nav>

          {/* Right */}
          <p className="text-xs text-[var(--text-dimmer)]">
            © {new Date().getFullYear()} AutoBounty. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
