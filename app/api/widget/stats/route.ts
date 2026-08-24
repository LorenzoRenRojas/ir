import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'

// Home-screen widget feed. Returns the handful of numbers that answer
// "is the outreach working?" — signups, founding members, referrals — so the
// loop between sending DMs and seeing results is visible without opening
// anything.
//
// Auth is a shared token in the query string, because iOS widget runtimes
// (Scriptable) can't hold a real session. That means the token IS the
// credential: it's compared in constant time, the endpoint is disabled
// entirely when WIDGET_TOKEN is unset, and the payload is deliberately
// limited to aggregate counts — no names, emails, or contract data.

export const dynamic = 'force-dynamic'

function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  // timingSafeEqual throws on length mismatch, so guard first. Length is not
  // secret; the token contents are.
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function GET(req: NextRequest) {
  const expected = process.env.WIDGET_TOKEN
  if (!expected) {
    return NextResponse.json(
      { error: 'Widget feed is disabled. Set WIDGET_TOKEN to enable it.' },
      { status: 503 }
    )
  }

  const provided = new URL(req.url).searchParams.get('token') ?? ''
  if (!tokenMatches(provided, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dayAgo = new Date(Date.now() - 86_400_000)
  const weekAgo = new Date(Date.now() - 7 * 86_400_000)

  // Every count is independently guarded: a widget must degrade to a dash,
  // never to an error screen on someone's home screen.
  const safe = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await fn()
    } catch {
      return fallback
    }
  }

  const [users, signupsToday, signupsWeek, founding, referred, liveContracts, newContracts] =
    await Promise.all([
      safe(() => prisma.user.count(), -1),
      safe(() => prisma.user.count({ where: { createdAt: { gte: dayAgo } } }), -1),
      safe(() => prisma.user.count({ where: { createdAt: { gte: weekAgo } } }), -1),
      safe(() => prisma.user.count({ where: { subscriptionTier: 'enterprise' } }), -1),
      safe(() => prisma.user.count({ where: { referredBy: { not: null } } }), -1),
      safe(
        () =>
          prisma.contractCache.count({
            where: { OR: [{ deadline: { gte: new Date() } }, { deadline: null }] },
          }),
        -1
      ),
      safe(() => prisma.contractCache.count({ where: { postedDate: { gte: dayAgo } } }), -1),
    ])

  return NextResponse.json(
    {
      users,
      signupsToday,
      signupsWeek,
      founding,
      referred,
      liveContracts,
      newContracts,
      updatedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
