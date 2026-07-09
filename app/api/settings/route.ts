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

    // Email changes: normalize (login lookups are lowercased), give a clear
    // conflict error instead of a 500, and reset verification — the crons
    // only mail verified addresses, and the user hasn't proven this one
    let normalizedEmail: string | undefined
    if (email !== undefined) {
      if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
      }
      normalizedEmail = email.toLowerCase().trim()
    }

    // Update user basic info
    const emailChanged = normalizedEmail !== undefined && normalizedEmail !== session.user.email?.toLowerCase()
    try {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          ...(name !== undefined && { name }),
          ...(emailChanged && { email: normalizedEmail, emailVerified: null }),
        },
      })
    } catch (err) {
      if ((err as { code?: string })?.code === 'P2002') {
        return NextResponse.json({ error: 'That email is already in use by another account.' }, { status: 409 })
      }
      throw err
    }

    if (emailChanged && normalizedEmail) {
      // Best-effort re-verification email to the new address
      try {
        const crypto = await import('crypto')
        const token = crypto.randomBytes(32).toString('hex')
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
        await prisma.verificationToken.create({ data: { identifier: normalizedEmail, token, expires } })
        const { sendVerificationEmail } = await import('@/lib/email')
        await sendVerificationEmail(normalizedEmail, token, process.env.NEXTAUTH_URL ?? 'https://ir-gov.app')
      } catch (mailErr) {
        console.error('Re-verification email failed (email still changed):', mailErr)
      }
    }

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
      if (yearFounded !== undefined) {
        const y = Number(yearFounded)
        profileData.yearFounded = Number.isInteger(y) && y > 1700 && y < 2200 ? y : null
      }
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
