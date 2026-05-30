import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { fetchContracts, MOCK_CONTRACTS } from '@/lib/sam-api'
import { calculateMatchScore } from '@/lib/matching'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const { searchParams } = new URL(req.url)

    const q = searchParams.get('q') ?? ''
    const agency = searchParams.get('agency') ?? ''
    const type = searchParams.get('type') ?? ''
    const setAside = searchParams.get('setAside') ?? ''
    const minValue = searchParams.get('minValue') ? Number(searchParams.get('minValue')) : undefined
    const maxValue = searchParams.get('maxValue') ? Number(searchParams.get('maxValue')) : undefined

    // Load company profile for match scoring if authenticated
    let profile = null
    if (session?.user?.id) {
      const dbProfile = await prisma.companyProfile.findUnique({
        where: { userId: session.user.id },
      })
      if (dbProfile) {
        profile = {
          naicsCodes: JSON.parse(dbProfile.naicsCodes) as string[],
          businessTypes: JSON.parse(dbProfile.businessTypes) as string[],
          contractSizePrefs: JSON.parse(dbProfile.contractSizePrefs) as string[],
          contractTypePrefs: JSON.parse(dbProfile.contractTypePrefs) as string[],
          geoPrefs: JSON.parse(dbProfile.geoPrefs) as string[],
          certifications: JSON.parse(dbProfile.certifications) as string[],
        }
      }
    }

    let contracts = await fetchContracts(profile ?? undefined)

    // Apply filters
    if (q) {
      const kw = q.toLowerCase()
      contracts = contracts.filter(
        (c) =>
          c.title.toLowerCase().includes(kw) ||
          c.agency.toLowerCase().includes(kw) ||
          c.description.toLowerCase().includes(kw)
      )
    }
    if (agency) {
      contracts = contracts.filter((c) =>
        c.agency.toLowerCase().includes(agency.toLowerCase())
      )
    }
    if (type) {
      contracts = contracts.filter((c) =>
        c.type.toLowerCase().includes(type.toLowerCase())
      )
    }
    if (setAside) {
      contracts = contracts.filter((c) =>
        (c.setAsideDescription ?? c.setAsideType ?? '').toLowerCase().includes(setAside.toLowerCase())
      )
    }
    if (minValue !== undefined) {
      contracts = contracts.filter((c) => (c.value ?? 0) >= minValue)
    }
    if (maxValue !== undefined) {
      contracts = contracts.filter((c) => (c.value ?? 0) <= maxValue)
    }

    // Score contracts if profile exists
    if (profile) {
      contracts = contracts.map((c) => {
        const breakdown = calculateMatchScore(c, profile!)
        return { ...c, matchScore: breakdown.total, matchBreakdown: breakdown }
      })
      contracts.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
    }

    return NextResponse.json({ contracts })
  } catch (err) {
    console.error('Contracts API error:', err)
    return NextResponse.json({ contracts: MOCK_CONTRACTS })
  }
}
