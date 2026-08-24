import { prisma } from './prisma'

// FIRM EVIDENCE
//
// Onboarding used to ask a company to describe itself: revenue bucket, the
// NAICS codes it is interested in, the agencies it would like to work with.
// All self-reported, all aspirational, and weak input for prediction.
//
// A UEI is better than every one of those answers combined. Federal award
// history is public, so given a UEI we can look up what a firm has actually
// won — which agencies bought from it, in which codes, at what values, over
// what period. Evidence in place of intention.
//
// The scoring consequence: instead of "this contract matches codes you said
// you care about", IR can say "you have won three contracts in this exact
// segment averaging $800K, and this one is $750K."

const API = 'https://api.usaspending.gov/api/v2/search/spending_by_award/'
const AWARD_TYPES = ['A', 'B', 'C', 'D']
const REFRESH_MS = 7 * 86_400_000 // a week; award history moves slowly

export interface Lane {
  key: string
  label: string
  count: number
  value: number
}

export interface FirmEvidence {
  uei: string
  recipientName: string
  totalAwards: number
  totalValue: number
  naicsLanes: Lane[]
  agencyLanes: Lane[]
  largestAward: number | null
  medianAward: number | null
  firstAward: string | null
  lastAward: string | null
  fetchedAt: string
  /** No federal award history found. Not an error — most new entrants have none. */
  empty: boolean
}

interface UsaAward {
  'Award ID'?: string
  'Recipient Name'?: string
  'Award Amount'?: number
  'Start Date'?: string
  'Awarding Agency'?: string
  'naics_code'?: string
  'NAICS Code'?: string
  [k: string]: unknown
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function topLanes(
  awards: UsaAward[],
  keyOf: (a: UsaAward) => string,
  limit = 5
): Lane[] {
  const acc = new Map<string, { count: number; value: number }>()
  for (const a of awards) {
    const key = keyOf(a)
    if (!key) continue
    const cur = acc.get(key) ?? { count: 0, value: 0 }
    cur.count++
    cur.value += typeof a['Award Amount'] === 'number' ? a['Award Amount'] : 0
    acc.set(key, cur)
  }
  return [...acc.entries()]
    .map(([key, v]) => ({ key, label: key, count: v.count, value: Math.round(v.value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

async function fetchFromUsaSpending(uei: string): Promise<FirmEvidence | null> {
  const collected: UsaAward[] = []
  try {
    // Two pages is plenty to characterise a small firm's lanes without
    // hammering a free API.
    for (let page = 1; page <= 2; page++) {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            recipient_search_text: [uei],
            award_type_codes: AWARD_TYPES,
            time_period: [{ start_date: '2015-01-01', end_date: new Date().toISOString().slice(0, 10) }],
          },
          fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Start Date', 'Awarding Agency', 'NAICS Code'],
          sort: 'Award Amount',
          order: 'desc',
          limit: 100,
          page,
        }),
        signal: AbortSignal.timeout(15_000),
      })
      if (!res.ok) break
      const data = await res.json()
      const results = Array.isArray(data?.results) ? (data.results as UsaAward[]) : []
      collected.push(...results)
      if (results.length < 100) break
    }
  } catch {
    return null
  }

  const amounts = collected
    .map(a => (typeof a['Award Amount'] === 'number' ? a['Award Amount'] : 0))
    .filter(n => n > 0)
  const dates = collected
    .map(a => (typeof a['Start Date'] === 'string' ? a['Start Date'] : null))
    .filter((d): d is string => !!d)
    .sort()

  return {
    uei,
    recipientName: String(collected[0]?.['Recipient Name'] ?? ''),
    totalAwards: collected.length,
    totalValue: Math.round(amounts.reduce((s, n) => s + n, 0)),
    naicsLanes: topLanes(collected, a => String(a['NAICS Code'] ?? a['naics_code'] ?? '')),
    agencyLanes: topLanes(collected, a => String(a['Awarding Agency'] ?? '')),
    largestAward: amounts.length ? Math.max(...amounts) : null,
    medianAward: median(amounts),
    firstAward: dates[0] ?? null,
    lastAward: dates[dates.length - 1] ?? null,
    fetchedAt: new Date().toISOString(),
    empty: collected.length === 0,
  }
}

/**
 * A firm's federal award history, cached for a week.
 *
 * Every failure path degrades to null rather than throwing: this feeds
 * onboarding and scoring, and neither may break because a free external API
 * had a bad minute.
 */
export async function getFirmEvidence(uei: string, opts: { force?: boolean } = {}): Promise<FirmEvidence | null> {
  const clean = uei.trim().toUpperCase()
  // UEIs are 12 alphanumeric characters. Reject anything else before spending
  // a network call on it.
  if (!/^[A-Z0-9]{12}$/.test(clean)) return null

  if (!opts.force) {
    try {
      const row = await prisma.firmHistory.findUnique({ where: { uei: clean } })
      if (row && Date.now() - row.fetchedAt.getTime() < REFRESH_MS) {
        return {
          uei: row.uei,
          recipientName: row.recipientName,
          totalAwards: row.totalAwards,
          totalValue: row.totalValue,
          naicsLanes: JSON.parse(row.naicsLanes) as Lane[],
          agencyLanes: JSON.parse(row.agencyLanes) as Lane[],
          largestAward: row.largestAward,
          medianAward: row.medianAward,
          firstAward: row.firstAward?.toISOString() ?? null,
          lastAward: row.lastAward?.toISOString() ?? null,
          fetchedAt: row.fetchedAt.toISOString(),
          empty: row.totalAwards === 0,
        }
      }
    } catch { /* table missing pre-migration — fall through to a live fetch */ }
  }

  const fresh = await fetchFromUsaSpending(clean)
  if (!fresh) return null

  try {
    const data = {
      recipientName: fresh.recipientName,
      totalAwards: fresh.totalAwards,
      totalValue: fresh.totalValue,
      naicsLanes: JSON.stringify(fresh.naicsLanes),
      agencyLanes: JSON.stringify(fresh.agencyLanes),
      largestAward: fresh.largestAward,
      medianAward: fresh.medianAward,
      firstAward: fresh.firstAward ? new Date(fresh.firstAward) : null,
      lastAward: fresh.lastAward ? new Date(fresh.lastAward) : null,
      fetchedAt: new Date(),
    }
    await prisma.firmHistory.upsert({
      where: { uei: clean },
      update: data,
      create: { uei: clean, ...data },
    })
  } catch { /* cache write is best-effort; the caller still gets fresh data */ }

  return fresh
}

/**
 * How well does a contract sit inside a firm's proven lanes?
 *
 * Returns attributable components rather than a single opaque number, because
 * a score nobody can explain is the problem this layer exists to fix.
 */
export interface FitEvidence {
  naicsMatch: { won: number; value: number } | null
  agencyMatch: { won: number; value: number } | null
  sizeFit: 'within' | 'stretch' | 'far-above' | 'unknown'
  reasons: string[]
}

export function evidenceFit(
  firm: FirmEvidence | null,
  contract: { naicsCode: string; agency: string; value?: number | null }
): FitEvidence {
  const out: FitEvidence = { naicsMatch: null, agencyMatch: null, sizeFit: 'unknown', reasons: [] }
  if (!firm || firm.empty) {
    out.reasons.push('No federal award history found for this UEI yet.')
    return out
  }

  const naics = firm.naicsLanes.find(l => l.key === contract.naicsCode)
    ?? firm.naicsLanes.find(l => l.key.slice(0, 4) === contract.naicsCode.slice(0, 4))
  if (naics) {
    out.naicsMatch = { won: naics.count, value: naics.value }
    out.reasons.push(
      naics.key === contract.naicsCode
        ? `You have won ${naics.count} award${naics.count === 1 ? '' : 's'} in NAICS ${naics.key}.`
        : `You have won ${naics.count} award${naics.count === 1 ? '' : 's'} in the ${naics.key.slice(0, 4)}xx family.`
    )
  }

  const agencyKey = contract.agency.split(' ')[0].toLowerCase()
  const agency = agencyKey
    ? firm.agencyLanes.find(l => l.label.toLowerCase().includes(agencyKey))
    : undefined
  if (agency) {
    out.agencyMatch = { won: agency.count, value: agency.value }
    out.reasons.push(`You have won ${agency.count} award${agency.count === 1 ? '' : 's'} from ${agency.label}.`)
  }

  // Capacity, judged against what this firm has actually delivered rather than
  // a revenue bucket it selected from a dropdown.
  if (contract.value && firm.largestAward) {
    if (contract.value <= firm.largestAward * 1.5) out.sizeFit = 'within'
    else if (contract.value <= firm.largestAward * 4) out.sizeFit = 'stretch'
    else out.sizeFit = 'far-above'
    const fmt = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`
    out.reasons.push(
      out.sizeFit === 'within'
        ? `At ${fmt(contract.value)}, this is within the range you have delivered (largest: ${fmt(firm.largestAward)}).`
        : out.sizeFit === 'stretch'
        ? `At ${fmt(contract.value)}, this is a stretch above your largest award (${fmt(firm.largestAward)}).`
        : `At ${fmt(contract.value)}, this is far above your largest award (${fmt(firm.largestAward)}). Teaming may be required.`
    )
  }

  if (out.reasons.length === 0) {
    out.reasons.push('This sits outside the lanes your award history covers.')
  }
  return out
}
