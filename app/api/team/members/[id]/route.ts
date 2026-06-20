import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Must be admin
    const adminMembership = await prisma.teamMember.findFirst({
      where: { userId: session.user.id, role: 'admin' },
    })
    if (!adminMembership) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const target = await prisma.teamMember.findUnique({ where: { id } })
    if (!target || target.teamId !== adminMembership.teamId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    const body = await req.json()
    const { permissions, role } = body

    const updated = await prisma.teamMember.update({
      where: { id },
      data: {
        ...(permissions !== undefined ? { permissions: JSON.stringify(permissions) } : {}),
        ...(role !== undefined ? { role } : {}),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    return NextResponse.json({
      member: {
        id: updated.id,
        userId: updated.userId,
        role: updated.role,
        permissions: JSON.parse(updated.permissions),
        joinedAt: updated.joinedAt,
        user: updated.user,
      },
    })
  } catch (err) {
    console.error('PATCH /api/team/members/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Must be admin
    const adminMembership = await prisma.teamMember.findFirst({
      where: { userId: session.user.id, role: 'admin' },
    })
    if (!adminMembership) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const target = await prisma.teamMember.findUnique({ where: { id } })
    if (!target || target.teamId !== adminMembership.teamId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Can't remove self if last admin
    if (target.userId === session.user.id) {
      const adminCount = await prisma.teamMember.count({
        where: { teamId: adminMembership.teamId, role: 'admin' },
      })
      if (adminCount <= 1) {
        return NextResponse.json({ error: 'Cannot remove the last admin from the team' }, { status: 400 })
      }
    }

    await prisma.teamMember.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/team/members/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
