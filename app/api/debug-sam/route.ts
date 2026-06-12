import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('key') !== process.env.MIGRATION_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.SAM_GOV_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'No SAM_GOV_API_KEY set' })

  const toDate = new Date()
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - 30)
  const fmt = (d: Date) =>
    `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`

  const params = new URLSearchParams({
    api_key: apiKey,
    limit: '3',
    active: 'true',
    postedFrom: fmt(fromDate),
    postedTo: fmt(toDate),
  })

  const url = `https://api.sam.gov/opportunities/v2/search?${params.toString()}`

  try {
    const res = await fetch(url, { cache: 'no-store' })
    const status = res.status
    const text = await res.text()
    let data
    try { data = JSON.parse(text) } catch { data = text }
    return NextResponse.json({
      status,
      topLevelKeys: typeof data === 'object' ? Object.keys(data) : 'not-json',
      totalRecords: (data as Record<string, unknown>)?.totalRecords,
      firstContract: Array.isArray((data as Record<string, unknown>)?.opportunitiesData)
        ? ((data as Record<string, unknown[]>).opportunitiesData)[0]
        : null,
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) })
  }
}
