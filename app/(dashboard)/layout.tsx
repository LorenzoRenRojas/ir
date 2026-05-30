import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { SignOutButton } from '@/components/ui/sign-out-button'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-slate-800">
          <Link href="/dashboard" className="text-2xl font-bold" style={{ color: '#C8A96E' }}>
            ᛁ IR
          </Link>
          <p className="text-xs text-slate-500 mt-0.5">Government Contract Intelligence</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLink href="/dashboard" icon="◈">
            Dashboard
          </NavLink>
          <NavLink href="/saved" icon="♡">
            Saved Contracts
          </NavLink>
          <NavLink href="/documents" icon="☰">
            Documents
          </NavLink>
          <NavLink href="/settings" icon="⚙">
            Settings
          </NavLink>
        </nav>

        {/* User info */}
        <div className="px-4 py-4 border-t border-slate-800">
          <p className="text-xs text-slate-500 truncate mb-1">{session.user.email}</p>
          <div className="flex items-center justify-between">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
              style={{
                background: 'rgba(200,169,110,0.15)',
                color: '#C8A96E',
                border: '1px solid rgba(200,169,110,0.3)',
              }}
            >
              {session.user.subscriptionTier ?? 'free'}
            </span>
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

function NavLink({ href, icon, children }: { href: string; icon: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm font-medium group"
    >
      <span className="text-base group-hover:text-[#C8A96E] transition-colors">{icon}</span>
      {children}
    </Link>
  )
}
