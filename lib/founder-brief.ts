import { prisma } from './prisma'

// The Monday founder brief. Two jobs: show whether the outreach moved anything
// last week, and hand over live market facts worth quoting in a LinkedIn
// comment. Everything here is computed from IR's own store — no external
// calls, no AI, so it costs nothing and can't fail on a missing API key.

const SMALL_BIZ_SET_ASIDES = new Set([
  'SBA', 'SBP', '8A', '8AN', 'SDVOSBC', 'SDVOSBS', 'WOSB', 'WOSBSS',
  'EDWOSB', 'EDWOSBSS', 'HZC', 'HZS', 'VSA', 'VSS',
])

export interface FounderBrief {
  // Movement
  users: number
  signupsWeek: number
  founding: number
  referred: number
  // Market facts, fresh every week
  liveCount: number
  postedThisWeek: number
  smallBizPct: number | null
  topNaics: { code: string; count: number }[]
  largest: { title: string; agency: string; valueFormatted: string } | null
}

const safe = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await fn()
  } catch {
    return fallback
  }
}

export async function buildFounderBrief(): Promise<FounderBrief> {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000)
  const now = new Date()

  const [users, signupsWeek, founding, referred, liveCount] = await Promise.all([
    safe(() => prisma.user.count(), 0),
    safe(() => prisma.user.count({ where: { createdAt: { gte: weekAgo } } }), 0),
    safe(() => prisma.user.count({ where: { subscriptionTier: 'enterprise' } }), 0),
    safe(() => prisma.user.count({ where: { referredBy: { not: null } } }), 0),
    safe(
      () => prisma.contractCache.count({ where: { OR: [{ deadline: { gte: now } }, { deadline: null }] } }),
      0
    ),
  ])

  // One scan of this week's postings powers every market stat below. Capped so
  // a big sync week can't blow the cron's memory or time budget.
  const week = await safe(
    () =>
      prisma.contractCache.findMany({
        where: { postedDate: { gte: weekAgo } },
        select: { naicsCode: true, setAside: true, payload: true },
        take: 4000,
      }),
    [] as { naicsCode: string; setAside: string; payload: string }[]
  )

  const postedThisWeek = week.length
  let smallBizPct: number | null = null
  const naicsCounts = new Map<string, number>()
  let largest: FounderBrief['largest'] = null
  let largestValue = 0

  if (postedThisWeek > 0) {
    let setAside = 0
    for (const row of week) {
      if (SMALL_BIZ_SET_ASIDES.has((row.setAside || '').toUpperCase())) setAside++
      if (row.naicsCode) naicsCounts.set(row.naicsCode, (naicsCounts.get(row.naicsCode) ?? 0) + 1)
      try {
        const c = JSON.parse(row.payload) as { title?: string; agency?: string; value?: number; valueFormatted?: string }
        if (typeof c.value === 'number' && c.value > largestValue) {
          largestValue = c.value
          largest = {
            title: c.title ?? 'Untitled',
            agency: c.agency ?? 'Unknown agency',
            valueFormatted: c.valueFormatted ?? '',
          }
        }
      } catch { /* one malformed payload must not break the brief */ }
    }
    smallBizPct = Math.round((setAside / postedThisWeek) * 100)
  }

  const topNaics = [...naicsCounts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  return { users, signupsWeek, founding, referred, liveCount, postedThisWeek, smallBizPct, topNaics, largest }
}

// Comment-ready lines built from the week's real numbers. These are the
// "data drop" openers from the engagement pack — the thing nobody else in a
// GovCon comment section can produce.
export function briefTalkingPoints(b: FounderBrief): string[] {
  const out: string[] = []
  if (b.postedThisWeek > 0) {
    out.push(`${b.postedThisWeek.toLocaleString()} new federal opportunities posted in the last 7 days.`)
  }
  if (b.smallBizPct !== null && b.postedThisWeek > 0) {
    out.push(`${b.smallBizPct}% of this week's postings are set aside for small business.`)
  }
  if (b.liveCount > 0) {
    out.push(`${b.liveCount.toLocaleString()} solicitations are open right now across the federal market.`)
  }
  if (b.topNaics.length > 0) {
    out.push(
      `Busiest NAICS codes this week: ${b.topNaics.map(n => `${n.code} (${n.count} postings)`).join(', ')}.`
    )
  }
  if (b.largest && b.largest.valueFormatted) {
    out.push(
      `Largest posting this week: ${b.largest.valueFormatted} at ${b.largest.agency}.`
    )
  }
  return out
}
