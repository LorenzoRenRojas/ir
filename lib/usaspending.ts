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
          agencies: [{ type: 'awarding', tier: 'toptier', name: agency }],
          award_type_codes: ['A', 'B', 'C', 'D'],
          time_period: [{ start_date: '2022-01-01', end_date: new Date().toISOString().split('T')[0] }],
        },
        fields: ['Recipient Name', 'Award Amount', 'Period of Performance Current End Date', 'Award ID'],
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
