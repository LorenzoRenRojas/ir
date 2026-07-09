// Market Intelligence — win-rate / competition benchmarks for a NAICS space,
// optionally scoped to an agency. Built ENTIRELY on USAspending PRIME award
// data, which is authoritative and complete (unlike subaward data). We only
// request the exact fields our incumbent fetch already uses in production
// ('Recipient Name', 'Award Amount', 'Award ID', 'Awarding Agency') so we can
// never trip a 400 on an unverified field name. Everything is derived from
// those — no claim we can't back with the data in hand.

export interface TopWinner {
  name: string
  total: number
  awards: number
  share: number // fraction of sampled dollars
}

export interface MarketBenchmark {
  naicsCode: string
  agency: string | null // null = across all agencies
  sampleSize: number
  windowMonths: number
  capped: boolean // true if more awards exist beyond the sample
  totalSampledValue: number
  minAward: number | null
  maxAward: number | null
  distinctWinners: number
  topWinners: TopWinner[] // up to 5, by dollars
  top5Share: number // 0..1 — concentration of the market among the top 5
  generatedAt: string
}

interface AwardRow {
  'Recipient Name'?: string
  'Award Amount'?: number
  'Award ID'?: string
  'Awarding Agency'?: string
}

const WINDOW_MONTHS = 36
const SAMPLE_CAP = 200 // 2 pages — bounds latency; the biggest awards define the market

async function fetchAwardPage(
  naicsCode: string,
  agency: string | null,
  page: number
): Promise<AwardRow[]> {
  const to = new Date()
  const from = new Date()
  from.setMonth(from.getMonth() - WINDOW_MONTHS)
  const iso = (d: Date) => d.toISOString().slice(0, 10)

  const filters: Record<string, unknown> = {
    naics_codes: [naicsCode],
    award_type_codes: ['A', 'B', 'C', 'D'],
    time_period: [{ start_date: iso(from), end_date: iso(to), date_type: 'date_signed' }],
  }
  if (agency) filters.agencies = [{ type: 'awarding', tier: 'toptier', name: agency }]

  const body = JSON.stringify({
    filters,
    // Known-good fields only — the exact set the incumbent fetch uses in prod
    fields: ['Recipient Name', 'Award Amount', 'Award ID', 'Awarding Agency'],
    sort: 'Award Amount',
    order: 'desc',
    limit: 100,
    page,
    subawards: false,
  })

  const attempt = async (timeoutMs: number): Promise<AwardRow[]> => {
    const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) throw new Error(`USAspending benchmark error ${res.status}`)
    const data = await res.json()
    return data.results ?? []
  }

  // Fail fast, retry once with a longer leash — USAspending is routinely slow
  try {
    return await attempt(20_000)
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')
    if (timedOut) {
      await new Promise(r => setTimeout(r, 1_000))
      return attempt(35_000)
    }
    throw err
  }
}

async function computeBenchmark(naicsCode: string, agency: string | null): Promise<MarketBenchmark> {
  const rows: AwardRow[] = []
  let capped = false
  for (let page = 1; page <= SAMPLE_CAP / 100; page++) {
    const batch = await fetchAwardPage(naicsCode, agency, page)
    rows.push(...batch)
    if (batch.length < 100) break
    if (page === SAMPLE_CAP / 100) capped = true // filled the cap — more exist
  }

  // Aggregate by recipient using only Recipient Name + Award Amount
  const byWinner = new Map<string, { total: number; awards: number }>()
  let totalSampledValue = 0
  let minAward: number | null = null
  let maxAward: number | null = null

  for (const row of rows) {
    const name = row['Recipient Name']?.trim()
    const amt = typeof row['Award Amount'] === 'number' ? row['Award Amount'] : null
    if (!name || amt === null || amt <= 0) continue
    totalSampledValue += amt
    minAward = minAward === null ? amt : Math.min(minAward, amt)
    maxAward = maxAward === null ? amt : Math.max(maxAward, amt)
    const cur = byWinner.get(name) ?? { total: 0, awards: 0 }
    cur.total += amt
    cur.awards += 1
    byWinner.set(name, cur)
  }

  const winners = [...byWinner.entries()]
    .map(([name, v]) => ({ name, total: v.total, awards: v.awards, share: totalSampledValue > 0 ? v.total / totalSampledValue : 0 }))
    .sort((a, b) => b.total - a.total)

  const topWinners = winners.slice(0, 5)
  const top5Share = topWinners.reduce((s, w) => s + w.share, 0)

  return {
    naicsCode,
    agency,
    sampleSize: rows.length,
    windowMonths: WINDOW_MONTHS,
    capped,
    totalSampledValue,
    minAward,
    maxAward,
    distinctWinners: byWinner.size,
    topWinners,
    top5Share,
    generatedAt: new Date().toISOString(),
  }
}

// DB-backed cache (Kv), 7-day TTL — benchmarks move slowly. Never cache an
// empty/zero-winner result; serve stale on upstream failure. Same discipline
// as the radar cache.
const BENCHMARK_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function benchmarkCacheKey(naicsCode: string, agency: string | null): string {
  return `benchmark:v1:${naicsCode}:${agency ? agency.toLowerCase().slice(0, 60) : 'all'}`
}

export async function getBenchmark(naicsCode: string, agency: string | null): Promise<MarketBenchmark | null> {
  if (!naicsCode) return null
  const { prisma } = await import('./prisma')
  const kvKey = benchmarkCacheKey(naicsCode, agency)

  let stale: MarketBenchmark | null = null
  try {
    const row = await prisma.kv.findUnique({ where: { key: kvKey } })
    if (row) {
      const parsed = JSON.parse(row.value) as MarketBenchmark
      if (parsed.distinctWinners > 0 && Date.now() - new Date(row.updatedAt).getTime() < BENCHMARK_TTL_MS) {
        return parsed
      }
      if (parsed.distinctWinners > 0) stale = parsed
    }
  } catch { /* Kv missing pre-migration — compute live */ }

  try {
    const fresh = await computeBenchmark(naicsCode, agency)
    if (fresh.distinctWinners > 0) {
      try {
        await prisma.kv.upsert({
          where: { key: kvKey },
          update: { value: JSON.stringify(fresh) },
          create: { key: kvKey, value: JSON.stringify(fresh) },
        })
      } catch { /* best-effort */ }
    }
    return fresh.distinctWinners > 0 ? fresh : stale
  } catch (err) {
    if (stale) return stale
    throw err
  }
}
