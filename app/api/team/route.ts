import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const membership = await prisma.teamMember.findFirst({
      where: { userId: session.user.id },
      include: {
        team: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
            invites: {
              where: { acceptedAt: null, expiresAt: { gt: new Date() } },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    })

    if (!membership) {
      return NextResponse.json({ team: null })
    }

    const isAdmin = membership.role === 'admin'

    return NextResponse.json({
      team: {
        id: membership.team.id,
        name: membership.team.name,
        role: membership.role,
        permissions: JSON.parse(membership.permissions),
        members: membership.team.members.map((m) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          permissions: JSON.parse(m.permissions),
          joinedAt: m.joinedAt,
          user: m.user,
        })),
        invites: isAdmin ? membership.team.invites : [],
      },
    })
  } catch (err) {
    console.error('GET /api/team error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
