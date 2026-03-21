'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import RoleToggle from './role-toggle'
import CompanyDashboard from './company-dashboard'
import DeveloperDashboard from './developer-dashboard'

export default function DashboardClient() {
  const [role, setRole] = useState<'company' | 'developer'>('company')

  return (
    <div className="min-h-screen bg-background grid-bg noise">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-black/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-[var(--text-dim)] hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <div className="w-px h-5 bg-white/10" />
            <Image
              src="/autobounty-logo.svg"
              alt="AutoBounty"
              width={120}
              height={16}
              priority
            />
          </div>
          <ConnectButton chainStatus="icon" showBalance={false} />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Role Toggle */}
        <div className="mb-8 max-w-md">
          <h1 className="text-2xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-sm text-[var(--text-dim)] mb-4">
            {role === 'company' 
              ? 'Create bounties for your GitHub issues and let developers solve them'
              : 'Browse open bounties and earn rewards by submitting PRs'
            }
          </p>
          <RoleToggle role={role} onRoleChange={setRole} />
        </div>

        {/* Role-specific Content */}
        {role === 'company' ? <CompanyDashboard /> : <DeveloperDashboard />}
      </main>
    </div>
  )
}
