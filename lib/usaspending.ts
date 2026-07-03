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
  const fiveYearsAgo = new Date()
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)
  const iso = (d: Date) => d.toISOString().slice(0, 10)

  const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: {
        award_type_codes: ['A', 'B', 'C', 'D'],
        naics_codes: naicsCodes,
        time_period: [{ start_date: iso(fiveYearsAgo), end_date: iso(now) }],
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
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
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

const END_DATE_SORT = 'Period of Performance Current End Date'
const FALLBACK_SORT = 'Award Amount' // known-good: the incumbent fetcher uses it in production

async function _fetchRecompetes(naicsKey: string): Promise<RecompeteAward[]> {
  const naicsCodes = naicsKey.split(',').filter(Boolean)
  if (naicsCodes.length === 0) return []

  const MONTH_MS = 30 * 24 * 60 * 60 * 1000
  const now = Date.now()
  const horizon = now + 18 * MONTH_MS
  const results: RecompeteAward[] = []
  const seen = new Set<string>()

  // Preferred: sorted by end date descending — far-future awards first, then
  // our window, then already-expired (page until we cross below "now").
  // If the API rejects that sort field (400), fall back to sorting by award
  // amount: we lose the early-exit optimization but still find the window by
  // scanning the largest awards, which are the ones worth chasing anyway.
  let sortField = END_DATE_SORT
  const MAX_PAGES = 5
  for (let page = 1; page <= MAX_PAGES; page++) {
    let rows: RecompeteRow[]
    try {
      rows = await fetchRecompetePage(naicsCodes, page, sortField)
    } catch (err) {
      const status = (err as Error & { status?: number }).status
      if (status === 400 && sortField === END_DATE_SORT && page === 1) {
        sortField = FALLBACK_SORT
        rows = await fetchRecompetePage(naicsCodes, page, sortField)
      } else {
        throw err
      }
    }
    if (rows.length === 0) break

    let crossedPast = false
    for (const row of rows) {
      const endStr = row['Period of Performance Current End Date']
      if (!endStr) continue
      const end = new Date(endStr).getTime()
      if (isNaN(end)) continue

      if (end < now) { crossedPast = true; continue }
      if (end > horizon) continue

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

    // Early exit is only valid when rows arrive in end-date order
    if (crossedPast && sortField === END_DATE_SORT) break
  }

  // Soonest expirations first — most actionable
  return results.sort((a, b) => a.monthsUntilExpiry - b.monthsUntilExpiry)
}

// 24h cache; the naicsKey arg is part of the cache key
const getCachedRecompetes = unstable_cache(
  _fetchRecompetes,
  ['usaspending-recompetes-v1'],
  { revalidate: 86400 }
)

export async function getRecompetes(naicsCodes: string[]): Promise<RecompeteAward[]> {
  const key = [...new Set(naicsCodes)].sort().join(',')
  if (!key) return []
  return getCachedRecompetes(key)
}
