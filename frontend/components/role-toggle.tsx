'use client'

import { Building2, Code2 } from 'lucide-react'

interface RoleToggleProps {
  role: 'company' | 'developer'
  onRoleChange: (role: 'company' | 'developer') => void
}

export default function RoleToggle({ role, onRoleChange }: RoleToggleProps) {
  return (
    <div className="flex gap-2 p-1 rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm">
      <button
        onClick={() => onRoleChange('company')}
        className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
          role === 'company'
            ? 'bg-[var(--brand-teal)] text-black shadow-lg shadow-[var(--brand-teal)]/20'
            : 'text-[var(--text-dim)] hover:text-white hover:bg-white/5'
        }`}
      >
        <Building2 className="w-4 h-4" />
        Company
      </button>
      <button
        onClick={() => onRoleChange('developer')}
        className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
          role === 'developer'
            ? 'bg-[var(--brand-blue)] text-black shadow-lg shadow-[var(--brand-blue)]/20'
            : 'text-[var(--text-dim)] hover:text-white hover:bg-white/5'
        }`}
      >
        <Code2 className="w-4 h-4" />
        Developer
      </button>
    </div>
  )
}
