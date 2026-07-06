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
      // Hard timeout: dozens of these run per dashboard load — one stalled
      // connection must never hang the page (this caused 2-minute boots)
      signal: AbortSignal.timeout(8_000),
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
  naicsCode: string
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
  'Start Date'?: string
  'End Date'?: string
  'Period of Performance Start Date'?: string
  'Period of Performance Current End Date'?: string
  'Awarding Agency'?: string
  'Awarding Sub Agency'?: string
  generated_internal_id?: string
}

// The API accepts the long names as FIELDS but its sort mappings only know
// the short names ('End Date') — confirmed by a live 400. Request short names.
const rowEnd = (r: RecompeteRow) => r['End Date'] ?? r['Period of Performance Current End Date']
const rowStart = (r: RecompeteRow) => r['Start Date'] ?? r['Period of Performance Start Date']

async function fetchRecompetePage(
  naicsCodes: string[],
  page: number,
  sortField: string,
  signedYearsAgo: [number, number] // [olderBound, newerBound], e.g. [6, 3]
): Promise<RecompeteRow[]> {
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const from = new Date(); from.setFullYear(from.getFullYear() - signedYearsAgo[0])
  const to = new Date(); to.setFullYear(to.getFullYear() - signedYearsAgo[1])

  const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: {
        award_type_codes: ['A', 'B', 'C', 'D'],
        naics_codes: naicsCodes,
        // Filter by SIGNING date (the only server-side date filter available;
        // there is no period-of-performance-end filter — verified in API docs)
        time_period: [{ start_date: iso(from), end_date: iso(to), date_type: 'date_signed' }],
      },
      fields: [
        'Award ID', 'Recipient Name', 'Award Amount', 'Description',
        'Start Date', 'End Date',
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

// Per-code, two complementary end-date-descending scans, each over a
// different SIGNING window, with early exit once the stream descends past
// today:
//  S1) signed 6–2.5 years ago — the recompete goldmine: multi-year awards
//      whose periods of performance end right about now. Their far-future
//      head is tiny, so the scan reaches the expiring window within a page.
//  S2) signed in the last 2.5 years — catches short-cycle awards. Deeper
//      far-future head, so it gets more pages.
// (There is no server-side end-date filter in the API — this signing-window
// decomposition is what makes the window reachable on big NAICS codes.)
const END_DATE_SORT2 = 'End Date'
const AMOUNT_SORT2 = 'Award Amount' // known-good sort mapping (used in prod by the incumbent fetcher)

async function scanWindow(
  code: string,
  signedYearsAgo: [number, number],
  maxPages: number,
  now: number
): Promise<RecompeteRow[]> {
  let sortField = END_DATE_SORT2
  const rows: RecompeteRow[] = []
  for (let page = 1; page <= maxPages; page++) {
    let batch: RecompeteRow[]
    try {
      batch = await fetchRecompetePage([code], page, sortField, signedYearsAgo)
    } catch (err) {
      // If the end-date sort mapping is ever rejected again, fall back to the
      // amount sort: the signing window already bounds the result set to
      // recompete-adjacent awards, so the window filter still finds hits.
      const status = (err as Error & { status?: number }).status
      if (status === 400 && sortField === END_DATE_SORT2 && page === 1) {
        sortField = AMOUNT_SORT2
        batch = await fetchRecompetePage([code], page, sortField, signedYearsAgo)
      } else {
        throw err
      }
    }
    rows.push(...batch)
    if (batch.length < 100) break
    // Early exit only valid in end-date order
    if (sortField === END_DATE_SORT2) {
      const last = rowEnd(batch[batch.length - 1] ?? {})
      if (last && new Date(last).getTime() < now) break // descended past today
    }
  }
  return rows
}

async function _fetchRecompetes(naicsKey: string): Promise<RecompeteAward[]> {
  const naicsCodes = naicsKey.split(',').filter(Boolean).slice(0, 6)
  if (naicsCodes.length === 0) return []

  const MONTH_MS = 30 * 24 * 60 * 60 * 1000
  const now = Date.now()
  const horizon = now + 18 * MONTH_MS

  // All codes in parallel; within a code, both signing windows in parallel.
  // Individual failures tolerated — partial radar beats no radar.
  const settled = await Promise.allSettled(
    naicsCodes.map(async (code) => {
      const [older, recent] = await Promise.allSettled([
        scanWindow(code, [6, 2.5], 3, now),
        scanWindow(code, [2.5, 0], 4, now),
      ])
      const rows: RecompeteRow[] = []
      if (older.status === 'fulfilled') rows.push(...older.value)
      if (recent.status === 'fulfilled') rows.push(...recent.value)
      if (rows.length === 0 && older.status === 'rejected') throw older.reason
      return { code, rows }
    })
  )

  const fulfilled = settled.filter((r): r is PromiseFulfilledResult<{ code: string; rows: RecompeteRow[] }> => r.status === 'fulfilled')
  if (fulfilled.length === 0) {
    const firstErr = settled.find((r): r is PromiseRejectedResult => r.status === 'rejected')
    throw firstErr?.reason ?? new Error('All USAspending queries failed')
  }

  const results: RecompeteAward[] = []
  const seen = new Set<string>()

  for (const { value: { code, rows } } of fulfilled) {
    for (const row of rows) {
      const endStr = rowEnd(row)
      if (!endStr) continue
      const end = new Date(endStr).getTime()
      if (isNaN(end) || end < now || end > horizon) continue

      // Quality gate: FPDS is full of thin records — de-obligated/$0 awards,
      // blank descriptions, missing internal IDs. Those are exactly the rows
      // that click through to a near-empty USAspending page, so a row has to
      // earn its card: linkable ID, real description, named incumbent, ≥$10K.
      const internalId = row.generated_internal_id?.trim()
      const description = row['Description']?.trim()
      const incumbent = row['Recipient Name']?.trim()
      const amount = typeof row['Award Amount'] === 'number' ? row['Award Amount'] : null
      if (!internalId || !description || !incumbent) continue
      if (amount === null || amount < 10_000) continue

      const id = row['Award ID'] ?? internalId
      if (!id || seen.has(id)) continue
      seen.add(id)

      results.push({
        awardId: id,
        internalId,
        naicsCode: code,
        description,
        incumbent,
        amount,
        startDate: rowStart(row) ?? null,
        endDate: endStr,
        agency: row['Awarding Agency'] ?? 'Unknown agency',
        subAgency: row['Awarding Sub Agency'] ?? '',
        monthsUntilExpiry: Math.max(0, Math.round((end - now) / MONTH_MS)),
        usaspendingUrl: `https://www.usaspending.gov/award/${encodeURIComponent(internalId)}`,
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
  // v4: quality-gated rows (real description, named incumbent, ≥$10K, linkable)
  const kvKey = `recompetes:v4:${key}`

  const { prisma } = await import('./prisma')

  let stale: RecompeteAward[] | null = null
  try {
    const row = await prisma.kv.findUnique({ where: { key: kvKey } })
    if (row) {
      const parsed = JSON.parse(row.value) as RecompeteAward[]
      // Never trust a cached EMPTY result — an upstream hiccup or a since-
      // fixed query bug would otherwise pin users at zero for a full day
      if (parsed.length > 0 && Date.now() - new Date(row.updatedAt).getTime() < RECOMPETE_TTL_MS) {
        return parsed // fresh — instant, no upstream call
      }
      if (parsed.length > 0) stale = parsed
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
