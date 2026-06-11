import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('key') !== process.env.MIGRATION_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.SAM_GOV_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'No SAM_GOV_API_KEY set' })

  const url = `https://api.sam.gov/opportunities/v2/search?api_key=${apiKey}&limit=3&active=true`

  try {
    const res = await fetch(url, { cache: 'no-store' })
    const status = res.status
    const text = await res.text()
    let data
    try { data = JSON.parse(text) } catch { data = text }
    return NextResponse.json({ status, topLevelKeys: typeof data === 'object' ? Object.keys(data) : 'not-json', sample: data })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) })
  }
}
