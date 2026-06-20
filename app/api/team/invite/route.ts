import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { email, role = 'member' } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Must be team admin
    const membership = await prisma.teamMember.findFirst({
      where: { userId: session.user.id, role: 'admin' },
    })
    if (!membership) {
      return NextResponse.json({ error: 'You must be a team admin to invite members' }, { status: 403 })
    }

    // Check if invited user already on a team
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      const existingMembership = await prisma.teamMember.findFirst({ where: { userId: existingUser.id } })
      if (existingMembership) {
        return NextResponse.json({ error: 'This user is already on a team' }, { status: 409 })
      }
    }

    // Check for existing pending invite
    const existingInvite = await prisma.teamInvite.findFirst({
      where: { teamId: membership.teamId, email, acceptedAt: null, expiresAt: { gt: new Date() } },
    })
    if (existingInvite) {
      return NextResponse.json({ error: 'A pending invite already exists for this email' }, { status: 409 })
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invite = await prisma.teamInvite.create({
      data: {
        teamId: membership.teamId,
        email,
        token: crypto.randomUUID(),
        role,
        expiresAt,
      },
    })

    return NextResponse.json({
      invite: {
        id: invite.id,
        token: invite.token,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
      },
    })
  } catch (err) {
    console.error('POST /api/team/invite error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const membership = await prisma.teamMember.findFirst({
      where: { userId: session.user.id, role: 'admin' },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const invites = await prisma.teamInvite.findMany({
      where: { teamId: membership.teamId, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ invites })
  } catch (err) {
    console.error('GET /api/team/invite error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
