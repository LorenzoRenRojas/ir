'use client'

import { signOut } from 'next-auth/react'

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      style={{ fontSize: 9, letterSpacing: '0.08em', color: 'rgba(0,0,0,0.28)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)', padding: 0 }}
    >
      SIGN OUT
    </button>
  )
}
