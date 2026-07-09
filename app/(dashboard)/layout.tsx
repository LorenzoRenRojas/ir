import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recompeteCodeKey } from '@/lib/usaspending'
import SideNav, { type SideNavStats } from '@/components/layout/SideNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const isEnterprise = session.user.subscriptionTier === 'enterprise'

  // Sidebar snapshot — everything in ONE parallel batch. These queries gate
  // the first paint of every dashboard page (Turso round-trips add up), so
  // they must never run sequentially. Radar count comes from the Kv cache
  // only (never triggers an upstream scan on navigation).
  const stats: SideNavStats = { activeValue: 0, dueThisWeek: 0, radarCount: null }
  let hasTeam = false
  const [membership, agg, due, radarRow] = await Promise.all([
    isEnterprise
      ? prisma.teamMember.findFirst({ where: { userId: session.user.id } }).catch(() => null)
      : Promise.resolve(null),
    prisma.savedContract.aggregate({
      where: { userId: session.user.id, status: { in: ['saved', 'pursuing', 'submitted'] } },
      _sum: { value: true },
    }).catch(() => null),
    prisma.savedContract.count({
      where: {
        userId: session.user.id,
        status: { in: ['saved', 'pursuing', 'submitted'] },
        deadline: { gte: new Date(), lte: new Date(Date.now() + 7 * 86_400_000) },
      },
    }).catch(() => null),
    prisma.companyProfile.findUnique({
      where: { userId: session.user.id },
      select: { naicsCodes: true },
    }).then(profile => {
      if (!profile) return null
      const codes = (JSON.parse(profile.naicsCodes) as string[]).slice(0, 8)
      if (codes.length === 0) return null
      // Radar cache is per NAICS code — merge the user's codes
      return prisma.kv.findMany({ where: { key: { in: codes.map(recompeteCodeKey) } } })
    }).catch(() => null),
  ])
  hasTeam = !!membership
  if (agg) stats.activeValue = agg._sum.value ?? 0
  if (due !== null) stats.dueThisWeek = due
  try {
    if (radarRow && radarRow.length > 0) {
      const ids = new Set<string>()
      for (const row of radarRow) {
        for (const a of JSON.parse(row.value) as { awardId: string }[]) ids.add(a.awardId)
      }
      stats.radarCount = ids.size
    }
  } catch { /* malformed cache — show a dash */ }

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
