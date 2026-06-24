export interface IncumbentData {
  awardee: string
  amount: number
  periodOfPerformanceEnd: string | null
  awardId: string
}

export async function fetchIncumbent(
  naicsCode: string,
  agency: string
): Promise<IncumbentData | null> {
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
      next: { revalidate: 86400 },
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
