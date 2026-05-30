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
    const { name, email, companyName, website, uei } = body

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
      },
      select: { id: true, name: true, email: true, subscriptionTier: true },
    })

    // Update company profile if provided
    if (companyName !== undefined) {
      const existingProfile = await prisma.companyProfile.findUnique({
        where: { userId: session.user.id },
      })

      if (existingProfile) {
        await prisma.companyProfile.update({
          where: { userId: session.user.id },
          data: {
            ...(companyName !== undefined && { companyName }),
            ...(website !== undefined && { website }),
            ...(uei !== undefined && { uei }),
          },
        })
      }
    }

    return NextResponse.json({ user: updatedUser })
  } catch (err) {
    console.error('Settings POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
