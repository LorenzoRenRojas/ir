import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getRecompetes } from '@/lib/usaspending'

export const maxDuration = 60

// Expiring federal awards in the user's NAICS codes — tomorrow's recompetes.
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await prisma.companyProfile.findUnique({
      where: { userId: session.user.id },
      select: { naicsCodes: true },
    })

    let naicsCodes: string[] = []
    try {
      naicsCodes = profile ? (JSON.parse(profile.naicsCodes) as string[]) : []
    } catch { /* malformed json → empty */ }

    if (naicsCodes.length === 0) {
      return NextResponse.json(
        { error: 'Add NAICS codes to your company profile to see expiring contracts in your space.' },
        { status: 400 }
      )
    }

    // Cap the filter set to keep the upstream query fast and cacheable
    const recompetes = await getRecompetes(naicsCodes.slice(0, 8))
    return NextResponse.json({ recompetes, naicsCodes: naicsCodes.slice(0, 8) })
  } catch (err) {
    console.error('GET /api/recompetes error:', err)
    const detail = err instanceof Error ? err.message.slice(0, 300) : ''
    return NextResponse.json(
      { error: `USAspending.gov request failed. ${detail}` },
      { status: 502 }
    )
  }
}
