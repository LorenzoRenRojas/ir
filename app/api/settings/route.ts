import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        subscriptionTier: true,
        onboardingDone: true,
        createdAt: true,
        companyProfile: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const profile = user.companyProfile
      ? {
          ...user.companyProfile,
          businessTypes: JSON.parse(user.companyProfile.businessTypes) as string[],
          naicsCodes: JSON.parse(user.companyProfile.naicsCodes) as string[],
          contractSizePrefs: JSON.parse(user.companyProfile.contractSizePrefs) as string[],
          contractTypePrefs: JSON.parse(user.companyProfile.contractTypePrefs) as string[],
          geoPrefs: JSON.parse(user.companyProfile.geoPrefs) as string[],
          certifications: JSON.parse(user.companyProfile.certifications) as string[],
          contractVehicles: JSON.parse(user.companyProfile.contractVehicles ?? '[]') as string[],
        }
      : null

    return NextResponse.json({ user: { ...user, companyProfile: profile } })
  } catch (err) {
    console.error('Settings GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      name, email,
      // Company profile fields
      companyName, website, uei, yearFounded,
      businessTypes, naicsCodes, contractSizePrefs, contractTypePrefs,
      geoPrefs, certifications, orgSize, contractVehicles,
      capabilityStatement, pastPerformance,
    } = body

    // Update user basic info
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
      },
    })

    // Update full company profile if any profile field is provided
    const hasProfileUpdate = [
      companyName, website, uei, yearFounded, businessTypes, naicsCodes,
      contractSizePrefs, contractTypePrefs, geoPrefs, certifications,
      orgSize, contractVehicles, capabilityStatement, pastPerformance,
    ].some((v) => v !== undefined)

    if (hasProfileUpdate) {
      const existingProfile = await prisma.companyProfile.findUnique({
        where: { userId: session.user.id },
      })

      const profileData: Record<string, unknown> = {}
      if (companyName !== undefined) profileData.companyName = companyName
      if (website !== undefined) profileData.website = website
      if (uei !== undefined) profileData.uei = uei
      if (yearFounded !== undefined) profileData.yearFounded = yearFounded ? Number(yearFounded) : null
      if (businessTypes !== undefined) profileData.businessTypes = JSON.stringify(businessTypes)
      if (naicsCodes !== undefined) profileData.naicsCodes = JSON.stringify(naicsCodes)
      if (contractSizePrefs !== undefined) profileData.contractSizePrefs = JSON.stringify(contractSizePrefs)
      if (contractTypePrefs !== undefined) profileData.contractTypePrefs = JSON.stringify(contractTypePrefs)
      if (geoPrefs !== undefined) profileData.geoPrefs = JSON.stringify(geoPrefs)
      if (certifications !== undefined) profileData.certifications = JSON.stringify(certifications)
      if (orgSize !== undefined) profileData.orgSize = orgSize
      if (contractVehicles !== undefined) profileData.contractVehicles = JSON.stringify(contractVehicles)
      if (capabilityStatement !== undefined) profileData.capabilityStatement = capabilityStatement
      if (pastPerformance !== undefined) profileData.pastPerformance = pastPerformance

      if (existingProfile) {
        await prisma.companyProfile.update({
          where: { userId: session.user.id },
          data: profileData,
        })
      } else if (companyName) {
        await prisma.companyProfile.create({
          data: {
            userId: session.user.id,
            companyName,
            ...profileData,
          },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Settings POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
