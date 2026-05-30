'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function Navbar() {
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-3xl text-[#C8A96E] font-bold leading-none" style={{ fontFamily: 'serif' }}>ᛁ</span>
            <span className="text-xl font-bold text-white tracking-wide">IR</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {session ? (
              <>
                <Link href="/dashboard" className="text-slate-300 hover:text-[#C8A96E] transition-colors text-sm font-medium">
                  Dashboard
                </Link>
                <Link href="/documents" className="text-slate-300 hover:text-[#C8A96E] transition-colors text-sm font-medium">
                  Documents
                </Link>
                <Link href="/settings" className="text-slate-300 hover:text-[#C8A96E] transition-colors text-sm font-medium">
                  Settings
                </Link>
                <div className="flex items-center gap-3 ml-4 pl-4 border-l border-slate-700">
                  <span className="text-sm text-slate-400">{session.user.name || session.user.email}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => signOut({ callbackUrl: '/' })}
                  >
                    Sign Out
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Link href="/#pricing" className="text-slate-300 hover:text-[#C8A96E] transition-colors text-sm font-medium">
                  Pricing
                </Link>
                <Link href="/login" className="text-slate-300 hover:text-[#C8A96E] transition-colors text-sm font-medium">
                  Sign In
                </Link>
                <Link href="/register">
                  <Button variant="gold" size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-slate-300 hover:text-white"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-4 border-t border-slate-800 space-y-3">
            {session ? (
              <>
                <Link href="/dashboard" className="block text-slate-300 hover:text-white py-2" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                <Link href="/documents" className="block text-slate-300 hover:text-white py-2" onClick={() => setMenuOpen(false)}>Documents</Link>
                <Link href="/settings" className="block text-slate-300 hover:text-white py-2" onClick={() => setMenuOpen(false)}>Settings</Link>
                <button onClick={() => signOut({ callbackUrl: '/' })} className="block text-slate-300 hover:text-white py-2 w-full text-left">Sign Out</button>
              </>
            ) : (
              <>
                <Link href="/#pricing" className="block text-slate-300 hover:text-white py-2" onClick={() => setMenuOpen(false)}>Pricing</Link>
                <Link href="/login" className="block text-slate-300 hover:text-white py-2" onClick={() => setMenuOpen(false)}>Sign In</Link>
                <Link href="/register" className="block" onClick={() => setMenuOpen(false)}>
                  <Button variant="gold" size="sm" className="w-full">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
