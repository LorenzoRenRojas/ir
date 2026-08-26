import { prisma } from './prisma'
import { TOP_NAICS_CODES } from './naics'

// DATA-DRIVEN POST DRAFTS
//
// IR watches the whole federal market every night. Almost nobody publishes
// what that market is doing week to week, which makes it the one thing IR can
// say on LinkedIn that no consultant, competitor, or commentator can copy.
//
// Two rules hold this honest, and they are load-bearing:
//
//   1. Every number is computed from records actually in the store. Nothing is
//      estimated, rounded up, or illustrative.
//   2. Every draft carries a `dataNote` stating exactly what was counted and
//      over what window, so a claim can be defended if someone challenges it —
//      and a draft with too thin a sample is withheld rather than softened.
//
// These are drafts, not scheduled posts. A human reads and edits before
// anything is published under their name.

export type PostKind =
  | 'weekly-pulse'
  | 'sector-heat'
  | 'agency-spotlight'
  | 'deadline-pressure'
  | 'set-aside-share'
  | 'pricing-reality'

export interface GeneratedPost {
  kind: PostKind
  label: string        // internal name for the admin list
  body: string         // paste-ready
  hashtags: string
  firstComment: string // links go here, never in the body
  dataNote: string     // what was counted, so the claim is defensible
}

const SMALL_BIZ_SET_ASIDES = new Set([
  'SBA', 'SBP', '8A', '8AN', 'SDVOSBC', 'SDVOSBS', 'WOSB', 'WOSBSS',
  'EDWOSB', 'EDWOSBSS', 'HZC', 'HZS', 'VSA', 'VSS',
])

const naicsName = (code: string): string =>
  TOP_NAICS_CODES.find(n => n.code === code)?.description ?? `NAICS ${code}`

const n = (x: number) => x.toLocaleString('en-US')
const usd = (v: number) =>
  v >= 1_000_000_000 ? `$${(v / 1_000_000_000).toFixed(1)}B`
  : v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M`
  : `$${Math.round(v / 1000)}K`

interface Row {
  naicsCode: string
  setAside: string
  payload: string
  deadline: Date | null
}

interface Parsed {
  naicsCode: string
  setAside: string
  agency: string
  title: string
  value: number | null
  deadline: Date | null
}

function parse(rows: Row[]): Parsed[] {
  const out: Parsed[] = []
  for (const r of rows) {
    try {
      const c = JSON.parse(r.payload) as { agency?: string; title?: string; value?: number }
      out.push({
        naicsCode: r.naicsCode,
        setAside: r.setAside,
        agency: c.agency ?? '',
        title: c.title ?? '',
        value: typeof c.value === 'number' && Number.isFinite(c.value) ? c.value : null,
        deadline: r.deadline,
      })
    } catch { /* one bad payload must not sink the batch */ }
  }
  return out
}

function tally(items: string[], limit: number): { key: string; count: number }[] {
  const acc = new Map<string, number>()
  for (const k of items) {
    if (!k) continue
    acc.set(k, (acc.get(k) ?? 0) + 1)
  }
  return [...acc.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/**
 * Build this week's drafts from live market data.
 *
 * Each generator returns null when its sample is too thin to state honestly.
 * An empty result means the store has nothing worth publishing, which is a
 * legitimate answer — better than shipping a post built on eleven records.
 */
export async function generatePosts(): Promise<GeneratedPost[]> {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000)
  const now = new Date()
  const posts: GeneratedPost[] = []

  let week: Parsed[] = []
  let live: Parsed[] = []
  try {
    const [weekRows, liveRows] = await Promise.all([
      prisma.contractCache.findMany({
        where: { postedDate: { gte: weekAgo } },
        select: { naicsCode: true, setAside: true, payload: true, deadline: true },
        take: 5000,
      }),
      prisma.contractCache.findMany({
        where: { OR: [{ deadline: { gte: now } }, { deadline: null }] },
        select: { naicsCode: true, setAside: true, payload: true, deadline: true },
        take: 5000,
      }),
    ])
    week = parse(weekRows)
    live = parse(liveRows)
  } catch {
    return posts
  }

  // ── 1. Weekly pulse ──────────────────────────────────────────────────────
  if (week.length >= 25) {
    const setAside = week.filter(c => SMALL_BIZ_SET_ASIDES.has(c.setAside.toUpperCase())).length
    const pct = Math.round((setAside / week.length) * 100)
    posts.push({
      kind: 'weekly-pulse',
      label: 'Weekly market pulse',
      body: [
        `${n(week.length)} new federal opportunities posted in the last seven days.`,
        ``,
        `${pct}% of them are set aside for small business. That is ${n(setAside)} contracts where the large primes are not allowed to bid against you.`,
        ``,
        `Most small businesses never see these, because checking means searching SAM.gov manually, every day, forever.`,
        ``,
        `The opportunities are not the scarce part. Knowing which ones are worth your time is.`,
      ].join('\n'),
      hashtags: '#GovCon #FederalContracting #SmallBusiness',
      firstComment: 'ir-gov.app',
      dataNote: `Counted ${n(week.length)} solicitations with a posted date in the last 7 days; ${n(setAside)} carried a small-business set-aside code.`,
    })
  }

  // ── 2. Sector heat ───────────────────────────────────────────────────────
  const topNaics = tally(week.map(c => c.naicsCode), 5)
  if (topNaics.length >= 3 && topNaics[0].count >= 8) {
    const lines = topNaics.map((t, i) => `${i + 1}. ${naicsName(t.key)} — ${n(t.count)} postings`)
    posts.push({
      kind: 'sector-heat',
      label: 'Where the money moved this week',
      body: [
        `Where federal buying actually moved this week:`,
        ``,
        ...lines,
        ``,
        `If your NAICS code is on this list, the market is active for you right now and you should be looking.`,
        ``,
        `If it is not, that is worth knowing too. Timing your capture effort to when your sector is actually buying beats bidding year-round on whatever appears.`,
      ].join('\n'),
      hashtags: '#GovCon #FederalContracting #NAICS',
      firstComment: 'ir-gov.app',
      dataNote: `Grouped ${n(week.length)} solicitations posted in the last 7 days by NAICS code; top ${topNaics.length} shown.`,
    })
  }

  // ── 3. Agency spotlight ──────────────────────────────────────────────────
  const topAgency = tally(week.map(c => c.agency), 1)[0]
  if (topAgency && topAgency.count >= 10) {
    const theirs = week.filter(c => c.agency === topAgency.key)
    const theirSetAside = theirs.filter(c => SMALL_BIZ_SET_ASIDES.has(c.setAside.toUpperCase())).length
    const pct = Math.round((theirSetAside / theirs.length) * 100)
    posts.push({
      kind: 'agency-spotlight',
      label: `Agency spotlight: ${topAgency.key}`,
      body: [
        `${topAgency.key} posted ${n(topAgency.count)} opportunities this week, more than any other buyer.`,
        ``,
        `${pct}% of them are small-business set-asides.`,
        ``,
        `Agencies buy in waves. Fiscal calendars, program cycles, and expiring contracts drive when requirements hit the street, and the firms that win consistently are watching those rhythms rather than reacting to whatever showed up today.`,
        ``,
        `Which agency is your best customer right now?`,
      ].join('\n'),
      hashtags: '#GovCon #FederalContracting #SmallBusiness',
      firstComment: 'ir-gov.app',
      dataNote: `${topAgency.key} accounted for ${n(topAgency.count)} of ${n(week.length)} solicitations posted in the last 7 days; ${n(theirSetAside)} were small-business set-asides.`,
    })
  }

  // ── 4. Deadline pressure ─────────────────────────────────────────────────
  const soon = live.filter(c => {
    if (!c.deadline) return false
    const days = (c.deadline.getTime() - now.getTime()) / 86_400_000
    return days >= 0 && days <= 7
  })
  if (soon.length >= 20) {
    const soonSetAside = soon.filter(c => SMALL_BIZ_SET_ASIDES.has(c.setAside.toUpperCase())).length
    posts.push({
      kind: 'deadline-pressure',
      label: 'Closing this week',
      body: [
        `${n(soon.length)} federal contracts close in the next seven days. ${n(soonSetAside)} of them are reserved for small business.`,
        ``,
        `Here is the uncomfortable part: if you are seeing a solicitation for the first time with a week left, you have already lost it.`,
        ``,
        `The firms that win were talking to that program office months ago, during market research, before anything was published. By the time it posts, the requirement is often shaped around whoever did that work.`,
        ``,
        `Bidding on what closes this week is not a strategy. Knowing what closes next quarter is.`,
      ].join('\n'),
      hashtags: '#GovCon #CaptureManagement #FederalContracting',
      firstComment: 'ir-gov.app',
      dataNote: `Counted ${n(soon.length)} open solicitations with response deadlines within 7 days; ${n(soonSetAside)} carried small-business set-aside codes.`,
    })
  }

  // ── 5. Set-aside breakdown across the live market ────────────────────────
  if (live.length >= 200) {
    const buckets: Record<string, number> = {}
    for (const c of live) {
      const code = c.setAside.toUpperCase()
      if (!SMALL_BIZ_SET_ASIDES.has(code)) continue
      const label =
        code.startsWith('8A') ? '8(a)'
        : code.startsWith('SDVOSB') ? 'SDVOSB'
        : code.startsWith('WOSB') || code.startsWith('EDWOSB') ? 'WOSB / EDWOSB'
        : code.startsWith('HZ') ? 'HUBZone'
        : code.startsWith('VS') ? 'VOSB'
        : 'Total Small Business'
      buckets[label] = (buckets[label] ?? 0) + 1
    }
    const rows = Object.entries(buckets).sort((a, b) => b[1] - a[1])
    const total = rows.reduce((s, [, v]) => s + v, 0)
    if (total >= 50) {
      posts.push({
        kind: 'set-aside-share',
        label: 'Set-aside breakdown, live market',
        body: [
          `${n(total)} federal contracts are open right now under small-business set-asides. Here is how they split:`,
          ``,
          ...rows.map(([label, count]) => `${label} — ${n(count)}`),
          ``,
          `Two things worth noticing.`,
          ``,
          `The narrower programs have far fewer contracts, but far fewer competitors chasing them. A smaller pool you are eligible for beats a large one you are not.`,
          ``,
          `And most firms qualify for more of these than they think. The certification is usually the barrier people imagine, not the one they actually face.`,
        ].join('\n'),
        hashtags: '#GovCon #SmallBusiness #8a #SDVOSB #WOSB #HUBZone',
        firstComment: 'ir-gov.app/eligibility',
        dataNote: `Grouped ${n(total)} currently-open solicitations by set-aside code out of ${n(live.length)} live records.`,
      })
    }
  }

  // ── 6. Pricing reality — only once outcomes exist ────────────────────────
  try {
    const outcomes = await prisma.contractOutcome.findMany({
      where: { matchConfidence: { gte: 55 }, awardAmount: { gt: 0 }, estimatedValue: { gt: 0 } },
      select: { estimatedValue: true, awardAmount: true },
      take: 1000,
    })
    const ratios = outcomes
      .map(o => o.awardAmount! / o.estimatedValue!)
      .filter(r => r > 0.05 && r < 20)
      .sort((a, b) => a - b)
    if (ratios.length >= 40) {
      const mid = ratios[Math.floor(ratios.length / 2)]
      const pct = Math.round(mid * 100)
      posts.push({
        kind: 'pricing-reality',
        label: 'Award vs advertised value',
        body: [
          `We have been recording what federal contracts actually award for, against what the solicitation advertised.`,
          ``,
          `Across ${n(ratios.length)} matched awards, the median came in at ${pct}% of the advertised value.`,
          ``,
          `Estimated value is a planning figure, not a price signal. Treating it as the target is one of the most common and most expensive mistakes a first-time bidder makes.`,
          ``,
          `The number that matters is what similar work actually awarded for, and that is public record if you know where to look.`,
        ].join('\n'),
        hashtags: '#GovCon #FederalContracting #Pricing',
        firstComment: 'ir-gov.app',
        dataNote: `Median of ${n(ratios.length)} solicitation-to-award matches at confidence 55+, comparing final award amount to advertised value.`,
      })
    }
  } catch { /* outcomes table not migrated yet — skip this draft */ }

  return posts
}
