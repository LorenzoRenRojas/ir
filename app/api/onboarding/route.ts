import { NextRequest, NextResponse, after } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      companyName, uei, website, yearFounded,
      businessTypes, naicsCodes, contractSizePrefs, contractTypePrefs,
      geoPrefs, certifications, contractVehicles, capabilityStatement,
      pastPerformance, annualRevenue, orgSize, agencyHistory,
    } = body

    if (!companyName?.trim()) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    const profileData = {
      companyName: companyName.trim(),
      uei: uei ?? null,
      website: website ?? null,
      yearFounded: yearFounded ?? null,
      businessTypes: JSON.stringify(businessTypes ?? []),
      naicsCodes: JSON.stringify(naicsCodes ?? []),
      contractSizePrefs: JSON.stringify(contractSizePrefs ?? []),
      contractTypePrefs: JSON.stringify(contractTypePrefs ?? []),
      geoPrefs: JSON.stringify(geoPrefs ?? []),
      certifications: JSON.stringify(certifications ?? []),
      contractVehicles: JSON.stringify(contractVehicles ?? []),
      capabilityStatement: capabilityStatement ?? null,
      pastPerformance: pastPerformance ?? null,
      annualRevenue: annualRevenue ?? null,
      orgSize: orgSize ?? null,
      agencyHistory: JSON.stringify(agencyHistory ?? []),
    }

    await prisma.companyProfile.upsert({
      where: { userId: session.user.id },
      update: profileData,
      create: { userId: session.user.id, ...profileData },
    })

    // Mark onboarding as done
    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboardingDone: true },
    })

    // Auto-create team if user doesn't have one
    const existingMembership = await prisma.teamMember.findFirst({ where: { userId: session.user.id } })
    if (!existingMembership) {
      const team = await prisma.team.create({ data: { name: companyName.trim() } })
      await prisma.teamMember.create({
        data: {
          teamId: team.id,
          userId: session.user.id,
          role: 'admin',
          permissions: JSON.stringify({
            canSaveContracts: true,
            canGenerateDocs: true,
            canManageWatchlist: true,
            canEditCompanyProfile: true,
          }),
        },
      })
    }

    // Prewarm this user's Recompete Radar in the background so their first
    // visit to the tab is instant instead of a cold 30s USAspending scan.
    after(async () => {
      try {
        const { getRecompetes } = await import('@/lib/usaspending')
        const codes = Array.isArray(naicsCodes) ? (naicsCodes as string[]).slice(0, 8) : []
        if (codes.length) await getRecompetes(codes)
      } catch (err) {
        console.error('Radar prewarm after onboarding failed (non-fatal):', err)
      }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Onboarding error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
