'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'

const navLinks = ['Product', 'How it Works', 'Developers', 'Docs']
const navIds = ['product', 'how-it-works', 'developers', 'tech-stack']

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-black/80 backdrop-blur-xl border-b border-white/5'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/autobounty-logo.svg"
            alt="AutoBounty"
            width={140}
            height={19}
            priority
            loading="eager"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link, i) => (
            <a
              key={link}
              href={`#${navIds[i]}`}
              className="text-sm text-[var(--text-dim)] hover:text-white transition-colors duration-200"
            >
              {link}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={handleLaunchApp}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--brand-teal)] text-black hover:bg-[var(--brand-blue)] transition-colors duration-200 cursor-pointer"
          >
            Launch App
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-white p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex flex-col gap-4">
          {navLinks.map((link, i) => (
            <a
              key={link}
              href={`#${navIds[i]}`}
              className="text-sm text-[var(--text-dim)] hover:text-white transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {link}
            </a>
          ))}
          <button
            className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--brand-teal)] text-black text-center cursor-pointer"
            onClick={() => { setMobileOpen(false); handleLaunchApp(); }}
          >
            Launch App
          </button>
        </div>
      )}
    </header>
  )
}
