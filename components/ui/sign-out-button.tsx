'use client'

import { signOut } from 'next-auth/react'

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
    >
      Sign out
    </button>
  )
}
