import { unstable_cache } from 'next/cache'

export interface IncumbentData {
  awardee: string
  amount: number
  periodOfPerformanceEnd: string | null
  awardId: string
}

async function _fetchIncumbent(naicsCode: string, agency: string): Promise<IncumbentData | null> {
  try {
    const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filters: {
          naics_codes: [naicsCode],
          award_type_codes: ['A', 'B', 'C', 'D'],
          time_period: [{ start_date: '2022-01-01', end_date: new Date().toISOString().split('T')[0] }],
        },
        fields: ['Recipient Name', 'Award Amount', 'Period of Performance Current End Date', 'Award ID', 'Awarding Agency'],
        sort: 'Award Amount',
        order: 'desc',
        limit: 1,
        page: 1,
      }),
    })

    if (!res.ok) return null

    const data = await res.json()
    const result = data?.results?.[0]
    if (!result) return null

    return {
      awardee: result['Recipient Name'] ?? 'Unknown',
      amount: result['Award Amount'] ?? 0,
      periodOfPerformanceEnd: result['Period of Performance Current End Date'] ?? null,
      awardId: result['Award ID'] ?? '',
    }
  } catch {
    return null
  }
}

// Cache per NAICS+agency combo for 24 hours — same pattern as SAM.gov contracts
const getCachedIncumbent = unstable_cache(
  _fetchIncumbent,
  ['usaspending-incumbent'],
  { revalidate: 86400 }
)

export async function fetchIncumbent(naicsCode: string, agency: string): Promise<IncumbentData | null> {
  return getCachedIncumbent(naicsCode, agency)
}

// Fetch incumbents for a list of contracts, deduplicating by NAICS+agency
// so identical combos only hit the API (or cache) once
export async function fetchIncumbents(
  contracts: { naicsCode: string; agency: string }[]
): Promise<(IncumbentData | null)[]> {
  // Build unique key map
  const unique = new Map<string, Promise<IncumbentData | null>>()

  for (const c of contracts) {
    const key = `${c.naicsCode}||${c.agency}`
    if (!unique.has(key)) {
      unique.set(key, getCachedIncumbent(c.naicsCode, c.agency))
    }
  }

  // Resolve all unique promises in parallel
  await Promise.all(unique.values())

  // Map back to original order, resolving the already-settled promises
  return Promise.all(
    contracts.map((c) => {
      const key = `${c.naicsCode}||${c.agency}`
      return unique.get(key)!
    })
  )
}

// ─── Recompete Radar ──────────────────────────────────────────────────────────
// Every federal contract expires on a known date, and most become recompete
// solicitations. Surfacing awards in the user's NAICS codes that end in the
// next 3–18 months gives them the lead 6+ months before SAM.gov shows it.

export interface RecompeteAward {
  awardId: string
  internalId: string | null
  description: string
  incumbent: string
  amount: number | null
  startDate: string | null
  endDate: string
  agency: string
  subAgency: string
  monthsUntilExpiry: number
  usaspendingUrl: string | null
}

interface RecompeteRow {
  'Award ID'?: string
  'Recipient Name'?: string
  'Award Amount'?: number
  'Description'?: string
  'Period of Performance Start Date'?: string
  'Period of Performance Current End Date'?: string
  'Awarding Agency'?: string
  'Awarding Sub Agency'?: string
  generated_internal_id?: string
}

async function fetchRecompetePage(
  naicsCodes: string[],
  page: number,
  sortField: string
): Promise<RecompeteRow[]> {
  const now = new Date()
  const windowStart = new Date()
  windowStart.setFullYear(windowStart.getFullYear() - 3)
  const iso = (d: Date) => d.toISOString().slice(0, 10)

  const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: {
        award_type_codes: ['A', 'B', 'C', 'D'],
        naics_codes: naicsCodes,
        // 3-year action window: recompete-relevant awards are recent; a wider
        // window made USAspending's query planner time out on big NAICS codes
        time_period: [{ start_date: iso(windowStart), end_date: iso(now) }],
      },
      fields: [
        'Award ID', 'Recipient Name', 'Award Amount', 'Description',
        'Period of Performance Start Date', 'Period of Performance Current End Date',
        'Awarding Agency', 'Awarding Sub Agency',
      ],
      sort: sortField,
      order: 'desc',
      limit: 100,
      page,
      subawards: false,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(40_000),
  })

  if (!res.ok) {
    const body = await res.text()
    const err = new Error(`USAspending API error ${res.status}: ${body.slice(0, 200)}`)
    ;(err as Error & { status?: number }).status = res.status
    throw err
  }

  const data = await res.json()
  return data.results ?? []
}

// Per-code, two complementary scans merged:
//  A) end-date descending with early exit — walks from far-future awards down
//     into the expiring window directly (complete when it works)
//  B) top awards by value — a bounded sweep that catches window awards even
//     when strategy A's far-future head is too deep to page through
// Value-sort alone missed everything: a big NAICS code's largest awards are
// multi-year vehicles ending 2028+, so the 18-month window filtered to zero.
async function scanByEndDate(code: string, now: number): Promise<RecompeteRow[]> {
  const rows: RecompeteRow[] = []
  for (let page = 1; page <= 4; page++) {
    const batch = await fetchRecompetePage([code], page, END_DATE_SORT)
    rows.push(...batch)
    if (batch.length < 100) break
    // Early exit once the stream has descended past "now" — everything after
    // this page has already expired
    const last = batch[batch.length - 1]?.['Period of Performance Current End Date']
    if (last && new Date(last).getTime() < now) break
  }
  return rows
}

async function sweepByAmount(code: string): Promise<RecompeteRow[]> {
  const pages = await Promise.allSettled([
    fetchRecompetePage([code], 1, AMOUNT_SORT),
    fetchRecompetePage([code], 2, AMOUNT_SORT),
  ])
  return pages.flatMap(p => (p.status === 'fulfilled' ? p.value : []))
}

const END_DATE_SORT = 'Period of Performance Current End Date'
const AMOUNT_SORT = 'Award Amount'

async function _fetchRecompetes(naicsKey: string): Promise<RecompeteAward[]> {
  const naicsCodes = naicsKey.split(',').filter(Boolean).slice(0, 6)
  if (naicsCodes.length === 0) return []

  const MONTH_MS = 30 * 24 * 60 * 60 * 1000
  const now = Date.now()
  const horizon = now + 18 * MONTH_MS

  // All codes in parallel; within a code, both strategies in parallel.
  // Individual failures are tolerated — partial radar beats no radar.
  const settled = await Promise.allSettled(
    naicsCodes.map(async (code) => {
      const [byDate, byAmount] = await Promise.allSettled([
        scanByEndDate(code, now),
        sweepByAmount(code),
      ])
      const rows: RecompeteRow[] = []
      if (byDate.status === 'fulfilled') rows.push(...byDate.value)
      if (byAmount.status === 'fulfilled') rows.push(...byAmount.value)
      if (rows.length === 0 && byDate.status === 'rejected') throw byDate.reason
      return rows
    })
  )

  const fulfilled = settled.filter((r): r is PromiseFulfilledResult<RecompeteRow[]> => r.status === 'fulfilled')
  if (fulfilled.length === 0) {
    const firstErr = settled.find((r): r is PromiseRejectedResult => r.status === 'rejected')
    throw firstErr?.reason ?? new Error('All USAspending queries failed')
  }

  const results: RecompeteAward[] = []
  const seen = new Set<string>()

  for (const { value: rows } of fulfilled) {
    for (const row of rows) {
      const endStr = row['Period of Performance Current End Date']
      if (!endStr) continue
      const end = new Date(endStr).getTime()
      if (isNaN(end) || end < now || end > horizon) continue

      const id = row['Award ID'] ?? row.generated_internal_id ?? ''
      if (!id || seen.has(id)) continue
      seen.add(id)

      results.push({
        awardId: id,
        internalId: row.generated_internal_id ?? null,
        description: row['Description']?.trim() || 'Untitled award',
        incumbent: row['Recipient Name'] ?? 'Unknown incumbent',
        amount: typeof row['Award Amount'] === 'number' ? row['Award Amount'] : null,
        startDate: row['Period of Performance Start Date'] ?? null,
        endDate: endStr,
        agency: row['Awarding Agency'] ?? 'Unknown agency',
        subAgency: row['Awarding Sub Agency'] ?? '',
        monthsUntilExpiry: Math.max(0, Math.round((end - now) / MONTH_MS)),
        usaspendingUrl: row.generated_internal_id
          ? `https://www.usaspending.gov/award/${row.generated_internal_id}`
          : null,
      })
    }
  }

  // Soonest expirations first — most actionable
  return results.sort((a, b) => a.monthsUntilExpiry - b.monthsUntilExpiry)
}

// DB-backed cache (Kv table): shared across all serverless instances, serves
// fresh results for 24h, and serves STALE results when USAspending is having
// a bad day — the radar degrades gracefully instead of erroring.
const RECOMPETE_TTL_MS = 24 * 60 * 60 * 1000

export async function getRecompetes(naicsCodes: string[]): Promise<RecompeteAward[]> {
  const key = [...new Set(naicsCodes)].sort().join(',')
  if (!key) return []
  const kvKey = `recompetes:v2:${key}`

  const { prisma } = await import('./prisma')

  let stale: RecompeteAward[] | null = null
  try {
    const row = await prisma.kv.findUnique({ where: { key: kvKey } })
    if (row) {
      const parsed = JSON.parse(row.value) as RecompeteAward[]
      if (Date.now() - new Date(row.updatedAt).getTime() < RECOMPETE_TTL_MS) {
        return parsed // fresh — instant, no upstream call
      }
      stale = parsed
    }
  } catch { /* Kv table missing pre-migration — compute live */ }

  try {
    const fresh = await _fetchRecompetes(key)
    try {
      await prisma.kv.upsert({
        where: { key: kvKey },
        update: { value: JSON.stringify(fresh) },
        create: { key: kvKey, value: JSON.stringify(fresh) },
      })
    } catch { /* cache write is best-effort */ }
    return fresh
  } catch (err) {
    if (stale) return stale // upstream down — yesterday's radar beats an error
    throw err
  }
}
