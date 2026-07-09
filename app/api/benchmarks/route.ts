import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getBenchmark } from '@/lib/benchmarks'

// USAspending is slow on a cold cache — give it real headroom
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const naics = searchParams.get('naics')?.trim()
  const agency = searchParams.get('agency')?.trim() || null
  if (!naics) {
    return NextResponse.json({ error: 'naics is required' }, { status: 400 })
  }

  try {
    // Scope to the agency first (most relevant), fall back to all-agency if the
    // agency-scoped sample is too thin to say anything meaningful
    let benchmark = await getBenchmark(naics, agency)
    if (agency && (!benchmark || benchmark.distinctWinners < 3)) {
      const allAgency = await getBenchmark(naics, null)
      if (allAgency && allAgency.distinctWinners >= 3) benchmark = allAgency
    }
    if (!benchmark || benchmark.distinctWinners === 0) {
      return NextResponse.json({ benchmark: null })
    }
    return NextResponse.json({ benchmark })
  } catch (err) {
    console.error('GET /api/benchmarks error:', err)
    return NextResponse.json({ error: 'Market data is temporarily unavailable.' }, { status: 502 })
  }
}
