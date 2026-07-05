import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import SideNav, { type SideNavStats } from '@/components/layout/SideNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const isEnterprise = session.user.subscriptionTier === 'enterprise'
  let hasTeam = false
  if (isEnterprise) {
    try {
      const membership = await prisma.teamMember.findFirst({ where: { userId: session.user.id } })
      hasTeam = !!membership
    } catch {
      hasTeam = false
    }
  }

  // Sidebar snapshot — three cheap queries; radar count comes from the Kv
  // cache only (never triggers an upstream scan on navigation)
  const stats: SideNavStats = { activeValue: 0, dueThisWeek: 0, radarCount: null }
  try {
    const [agg, due] = await Promise.all([
      prisma.savedContract.aggregate({
        where: { userId: session.user.id, status: { in: ['saved', 'pursuing', 'submitted'] } },
        _sum: { value: true },
      }),
      prisma.savedContract.count({
        where: {
          userId: session.user.id,
          status: { in: ['saved', 'pursuing', 'submitted'] },
          deadline: { gte: new Date(), lte: new Date(Date.now() + 7 * 86_400_000) },
        },
      }),
    ])
    stats.activeValue = agg._sum.value ?? 0
    stats.dueThisWeek = due
  } catch { /* pre-migration or DB hiccup — snapshot stays zeroed */ }

  try {
    const profile = await prisma.companyProfile.findUnique({
      where: { userId: session.user.id },
      select: { naicsCodes: true },
    })
    if (profile) {
      const codes = (JSON.parse(profile.naicsCodes) as string[]).slice(0, 8)
      const key = `recompetes:v3:${[...new Set(codes)].sort().join(',')}`
      const row = await prisma.kv.findUnique({ where: { key } })
      if (row) stats.radarCount = (JSON.parse(row.value) as unknown[]).length
    }
  } catch { /* cache miss or table missing — show a dash */ }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F8F7', display: 'flex', fontFamily: 'var(--font-geist-mono, monospace)', color: '#0A0A0A' }}>
      <SideNav
        email={session.user.email ?? ''}
        tier={session.user.subscriptionTier ?? 'free'}
        stats={stats}
        showCreateTeam={isEnterprise && !hasTeam}
      />
      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
