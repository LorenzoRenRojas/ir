import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit, ipKey } from '@/lib/rate-limit'

// POST — change password. { currentPassword, newPassword }
export async function POST(req: NextRequest) {
  const { allowed } = rateLimit(ipKey(req, 'pwchange'), 5, 15 * 60_000)
  if (!allowed) return NextResponse.json({ error: 'Too many attempts. Wait a few minutes.' }, { status: 429 })

  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { currentPassword, newPassword } = await req.json()
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    if (user.password) {
      // Existing password must be verified
      if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password))) {
        return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 403 })
      }
    }
    // Google-only accounts (no password) may SET one here — that's fine.

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(newPassword, 12) },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Password change error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — permanently delete the account. { confirm: 'DELETE', password? }
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { confirm, password } = await req.json()
    if (confirm !== 'DELETE') {
      return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Password-holders must prove it; Google-only accounts confirm via the word alone
    if (user.password) {
      if (!password || !(await bcrypt.compare(password, user.password))) {
        return NextResponse.json({ error: 'Password is incorrect.' }, { status: 403 })
      }
    }

    // Cascades: profile, saved contracts, documents, team memberships,
    // sessions, accounts, embeddings all have onDelete: Cascade
    await prisma.user.delete({ where: { id: user.id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Account deletion error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
