import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getFirmEvidence } from '@/lib/firm-history'
import { rateLimit } from '@/lib/rate-limit'

// UEI → real federal award history. Powers the onboarding step that replaces
// twenty self-reported questions with one verifiable field.

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // USAspending is free but not ours to hammer.
    const { allowed } = rateLimit(`firm-lookup:${session.user.id}`, 20, 60_000)
    if (!allowed) {
      return NextResponse.json({ error: 'Too many lookups. Wait a moment.' }, { status: 429 })
    }

    const uei = new URL(req.url).searchParams.get('uei') ?? ''
    if (!/^[A-Za-z0-9]{12}$/.test(uei.trim())) {
      return NextResponse.json({ error: 'A UEI is 12 letters and numbers.' }, { status: 400 })
    }

    const evidence = await getFirmEvidence(uei)
    if (!evidence) {
      return NextResponse.json(
        { error: 'Could not reach the federal award database. Your profile still saves without this.' },
        { status: 502 }
      )
    }
    return NextResponse.json({ evidence })
  } catch (err) {
    console.error('Firm lookup error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
