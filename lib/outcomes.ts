import { prisma } from './prisma'

// GROUND TRUTH COLLECTOR
//
// IR sees solicitations. USAspending records awards. Neither alone tells you
// whether a bid was winnable — but joined, one archived solicitation plus its
// eventual award is a labeled example: "a contract with these characteristics
// drew this many offers and was won by a firm of this size at this price."
//
// That dataset is what turns a scoring heuristic into a measurement, and it is
// strictly forward-accumulating: awards land months after a solicitation
// closes, so every day this does not run is training data that expires. The
// collector therefore runs long before anything is trained on it.
//
// Matching is deliberately conservative. A wrong label is worse than no label,
// so every row carries the method and a confidence score, and downstream
// consumers can filter on it.

const API = 'https://api.usaspending.gov/api/v2/search/spending_by_award/'
const AWARD_TYPES = ['A', 'B', 'C', 'D'] // definitive contracts + purchase orders

export interface AwardMatch {
  awardId: string
  awardee: string
  awardeeUei: string
  awardAmount: number | null
  awardDate: string | null
  offersReceived: number | null
  awardeeIsSmall: boolean | null
  matchConfidence: number
  matchMethod: string
}

interface UsaAward {
  'Award ID'?: string
  'Recipient Name'?: string
  'Recipient UEI'?: string
  'Award Amount'?: number
  'Start Date'?: string
  'Last Modified Date'?: string
  'Awarding Agency'?: string
  'NAICS Code'?: string
  [k: string]: unknown
}

async function search(body: unknown, timeoutMs = 12_000): Promise<UsaAward[]> {
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data?.results) ? (data.results as UsaAward[]) : []
  } catch {
    return []
  }
}

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null

// Awards typically post weeks to months after a solicitation closes. Searching
// a window anchored on the deadline keeps the candidate set small and makes a
// statistical match meaningful rather than coincidental.
function awardWindow(deadline: Date | null, posted: Date | null): { start: string; end: string } {
  const anchor = deadline ?? posted ?? new Date()
  const start = new Date(anchor.getTime() - 30 * 86_400_000)
  const end = new Date(anchor.getTime() + 400 * 86_400_000)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { start: iso(start), end: iso(end) }
}

/**
 * Find the award that most likely resulted from a solicitation.
 *
 * Two strategies, most reliable first. Statistical matching only fires when
 * the candidate set is small enough that a single result is genuinely
 * distinctive — otherwise we record nothing rather than guess.
 */
export async function matchAward(sol: {
  solicitationNumber: string
  naicsCode: string
  agency: string
  estimatedValue: number | null
  deadline: Date | null
  postedDate: Date | null
}): Promise<AwardMatch | null> {
  const fields = [
    'Award ID', 'Recipient Name', 'Recipient UEI', 'Award Amount',
    'Start Date', 'Awarding Agency', 'NAICS Code',
  ]
  const window = awardWindow(sol.deadline, sol.postedDate)

  const shape = (a: UsaAward, confidence: number, method: string): AwardMatch => ({
    awardId: String(a['Award ID'] ?? ''),
    awardee: String(a['Recipient Name'] ?? 'Unknown'),
    awardeeUei: String(a['Recipient UEI'] ?? ''),
    awardAmount: num(a['Award Amount']),
    awardDate: typeof a['Start Date'] === 'string' ? a['Start Date'] : null,
    // USAspending's search endpoint does not expose offer counts; this is
    // enriched separately where available and left null rather than invented.
    offersReceived: null,
    awardeeIsSmall: null,
    matchConfidence: confidence,
    matchMethod: method,
  })

  // 1. Exact — the award record cites the solicitation we saw.
  if (sol.solicitationNumber) {
    const exact = await search({
      filters: {
        keywords: [sol.solicitationNumber],
        award_type_codes: AWARD_TYPES,
        time_period: [{ start_date: window.start, end_date: window.end }],
      },
      fields, sort: 'Award Amount', order: 'desc', limit: 5, page: 1,
    })
    // Require the keyword to actually appear in the award id: USAspending's
    // keyword search is fuzzy, and a loose hit is not evidence.
    const cited = exact.find(a =>
      String(a['Award ID'] ?? '').toUpperCase().includes(sol.solicitationNumber.toUpperCase())
    )
    if (cited) return shape(cited, 100, 'solicitation-number')
    if (exact.length === 1) return shape(exact[0], 75, 'solicitation-keyword')
  }

  // 2. Statistical — same NAICS and agency, award landing in the expected
  // window, value in a plausible band. Only trusted when the field is thin.
  if (!sol.naicsCode) return null
  const candidates = await search({
    filters: {
      naics_codes: [sol.naicsCode],
      award_type_codes: AWARD_TYPES,
      time_period: [{ start_date: window.start, end_date: window.end }],
    },
    fields, sort: 'Award Amount', order: 'desc', limit: 25, page: 1,
  })
  if (candidates.length === 0) return null

  const agency = sol.agency.toLowerCase()
  const sameAgency = candidates.filter(a =>
    agency && String(a['Awarding Agency'] ?? '').toLowerCase().includes(agency.split(' ')[0])
  )
  const pool = sameAgency.length > 0 ? sameAgency : []
  if (pool.length === 0) return null

  // With an advertised value, prefer the closest award within 3x either way.
  if (sol.estimatedValue && sol.estimatedValue > 0) {
    const near = pool
      .map(a => ({ a, amt: num(a['Award Amount']) }))
      .filter(x => x.amt !== null && x.amt > sol.estimatedValue! / 3 && x.amt < sol.estimatedValue! * 3)
      .sort((x, y) => Math.abs(x.amt! - sol.estimatedValue!) - Math.abs(y.amt! - sol.estimatedValue!))
    if (near.length === 1) return shape(near[0].a, 55, 'naics-agency-value')
    if (near.length > 1) return shape(near[0].a, 40, 'naics-agency-value-multi')
  }

  // A single agency award in the whole window is distinctive enough to record
  // at low confidence; anything more crowded is not evidence.
  if (pool.length === 1) return shape(pool[0], 45, 'naics-agency-sole')
  return null
}

export interface CollectStats {
  scanned: number
  matched: number
  skipped: number
  errors: number
}

/**
 * Walk archived solicitations that have no recorded outcome yet and try to
 * find their awards. Designed to run as an unattended nightly trickle:
 * bounded by both count and wall clock, and safe to interrupt at any point.
 */
export async function collectOutcomes(opts: {
  limit?: number
  timeBudgetMs?: number
} = {}): Promise<CollectStats> {
  const limit = opts.limit ?? 40
  const budget = opts.timeBudgetMs ?? 60_000
  const startedAt = Date.now()
  const stats: CollectStats = { scanned: 0, matched: 0, skipped: 0, errors: 0 }

  let rows: { noticeId: string; payload: string; naicsCode: string; setAside: string; postedDate: Date | null; deadline: Date | null }[] = []
  try {
    // Oldest archived first: those are the ones whose awards have had the most
    // time to actually post.
    const already = await prisma.contractOutcome.findMany({ select: { noticeId: true }, take: 5000 })
    const have = new Set(already.map(r => r.noticeId))
    const archived = await prisma.contractArchive.findMany({
      orderBy: { postedDate: 'asc' },
      take: limit * 4,
      select: { noticeId: true, payload: true, naicsCode: true, setAside: true, postedDate: true, deadline: true },
    })
    rows = archived.filter(r => !have.has(r.noticeId)).slice(0, limit)
  } catch {
    stats.errors++
    return stats
  }

  for (const row of rows) {
    if (Date.now() - startedAt > budget) break
    stats.scanned++
    try {
      const c = JSON.parse(row.payload) as {
        solicitationNumber?: string; agency?: string; value?: number; title?: string
      }
      const match = await matchAward({
        solicitationNumber: c.solicitationNumber ?? '',
        naicsCode: row.naicsCode,
        agency: c.agency ?? '',
        estimatedValue: typeof c.value === 'number' ? c.value : null,
        deadline: row.deadline,
        postedDate: row.postedDate,
      })

      if (!match) { stats.skipped++; continue }

      // The feature snapshot is written at record time so a model trained
      // later sees what the scorer saw, not a reconstruction.
      const features = JSON.stringify({
        naicsCode: row.naicsCode,
        setAside: row.setAside,
        agency: c.agency ?? '',
        estimatedValue: c.value ?? null,
        awardAmount: match.awardAmount,
        valueRatio: c.value && match.awardAmount ? +(match.awardAmount / c.value).toFixed(3) : null,
        daysToAward: row.deadline && match.awardDate
          ? Math.round((new Date(match.awardDate).getTime() - row.deadline.getTime()) / 86_400_000)
          : null,
      })

      await prisma.contractOutcome.upsert({
        where: { noticeId: row.noticeId },
        update: {},
        create: {
          noticeId: row.noticeId,
          solicitationNum: c.solicitationNumber ?? '',
          naicsCode: row.naicsCode,
          setAside: row.setAside,
          agency: c.agency ?? '',
          estimatedValue: typeof c.value === 'number' ? c.value : null,
          postedDate: row.postedDate,
          deadline: row.deadline,
          awardId: match.awardId,
          awardee: match.awardee,
          awardeeUei: match.awardeeUei,
          awardAmount: match.awardAmount,
          awardDate: match.awardDate ? new Date(match.awardDate) : null,
          offersReceived: match.offersReceived,
          awardeeIsSmall: match.awardeeIsSmall,
          matchConfidence: match.matchConfidence,
          matchMethod: match.matchMethod,
          features,
        },
      })
      stats.matched++
    } catch {
      stats.errors++
    }
  }

  return stats
}

export async function outcomeCount(): Promise<{ total: number; highConfidence: number }> {
  try {
    const [total, highConfidence] = await Promise.all([
      prisma.contractOutcome.count(),
      prisma.contractOutcome.count({ where: { matchConfidence: { gte: 75 } } }),
    ])
    return { total, highConfidence }
  } catch {
    return { total: 0, highConfidence: 0 }
  }
}
