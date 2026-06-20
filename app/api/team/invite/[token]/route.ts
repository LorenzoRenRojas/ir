import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const invite = await prisma.teamInvite.findUnique({
      where: { token },
      include: { team: true },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    if (invite.acceptedAt) {
      return NextResponse.json({ error: 'Invite already accepted' }, { status: 410 })
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 410 })
    }

    return NextResponse.json({
      invite: {
        email: invite.email,
        teamName: invite.team.name,
        role: invite.role,
        expiresAt: invite.expiresAt,
      },
    })
  } catch (err) {
    console.error('GET /api/team/invite/[token] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invite = await prisma.teamInvite.findUnique({
      where: { token },
      include: { team: true },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    if (invite.acceptedAt) {
      return NextResponse.json({ error: 'Invite already accepted' }, { status: 410 })
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 410 })
    }

    // Validate email matches
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user || user.email !== invite.email) {
      return NextResponse.json({ error: 'This invite is for a different email address' }, { status: 403 })
    }

    // Check user isn't already on a team
    const existingMembership = await prisma.teamMember.findFirst({ where: { userId: session.user.id } })
    if (existingMembership) {
      return NextResponse.json({ error: 'You are already a member of a team' }, { status: 409 })
    }

    // Create team member and mark invite accepted
    await prisma.$transaction([
      prisma.teamMember.create({
        data: {
          teamId: invite.teamId,
          userId: session.user.id,
          role: invite.role,
        },
      }),
      prisma.teamInvite.update({
        where: { token },
        data: { acceptedAt: new Date() },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/team/invite/[token] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
