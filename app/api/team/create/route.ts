import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.subscriptionTier !== 'enterprise') {
      return NextResponse.json({ error: 'Enterprise subscription required' }, { status: 403 })
    }

    const existing = await prisma.teamMember.findFirst({ where: { userId: session.user.id } })
    if (existing) {
      return NextResponse.json({ error: 'Already in a team' }, { status: 400 })
    }

    const body = await req.json()
    const { name } = body
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 })
    }

    const team = await prisma.team.create({ data: { name: name.trim() } })
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

    return NextResponse.json({ team })
  } catch (err) {
    console.error('Create team error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
