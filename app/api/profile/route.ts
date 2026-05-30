import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await prisma.companyProfile.findUnique({
      where: { userId: session.user.id },
    })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, subscriptionTier: true, createdAt: true },
    })

    if (!profile) {
      return NextResponse.json({ profile: null, user })
    }

    return NextResponse.json({
      profile: {
        ...profile,
        businessTypes: JSON.parse(profile.businessTypes) as string[],
        naicsCodes: JSON.parse(profile.naicsCodes) as string[],
        contractSizePrefs: JSON.parse(profile.contractSizePrefs) as string[],
        contractTypePrefs: JSON.parse(profile.contractTypePrefs) as string[],
        geoPrefs: JSON.parse(profile.geoPrefs) as string[],
        certifications: JSON.parse(profile.certifications) as string[],
      },
      user,
    })
  } catch (err) {
    console.error('Profile GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      name,
      companyName,
      uei,
      website,
      yearFounded,
      businessTypes,
      naicsCodes,
      contractSizePrefs,
      contractTypePrefs,
      geoPrefs,
      certifications,
      clearanceLevel,
    } = body

    // Update user name if provided
    if (name !== undefined) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { name },
      })
    }

    // Update company profile
    if (companyName !== undefined) {
      await prisma.companyProfile.upsert({
        where: { userId: session.user.id },
        update: {
          companyName,
          uei: uei ?? null,
          website: website ?? null,
          yearFounded: yearFounded ?? null,
          businessTypes: JSON.stringify(businessTypes ?? []),
          naicsCodes: JSON.stringify(naicsCodes ?? []),
          contractSizePrefs: JSON.stringify(contractSizePrefs ?? []),
          contractTypePrefs: JSON.stringify(contractTypePrefs ?? []),
          geoPrefs: JSON.stringify(geoPrefs ?? []),
          certifications: JSON.stringify(certifications ?? []),
          clearanceLevel: clearanceLevel ?? null,
        },
        create: {
          userId: session.user.id,
          companyName,
          uei: uei ?? null,
          website: website ?? null,
          yearFounded: yearFounded ?? null,
          businessTypes: JSON.stringify(businessTypes ?? []),
          naicsCodes: JSON.stringify(naicsCodes ?? []),
          contractSizePrefs: JSON.stringify(contractSizePrefs ?? []),
          contractTypePrefs: JSON.stringify(contractTypePrefs ?? []),
          geoPrefs: JSON.stringify(geoPrefs ?? []),
          certifications: JSON.stringify(certifications ?? []),
          clearanceLevel: clearanceLevel ?? null,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Profile PUT error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
