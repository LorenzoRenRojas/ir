import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'

export async function GET(req: Request) {
  // Must be an admin session (DB role or ADMIN_EMAIL bootstrap) — key alone is not sufficient
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')
  const email = searchParams.get('email')

  if (!key || key !== process.env.MIGRATION_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!email) {
    return NextResponse.json({ error: 'email param required' }, { status: 400 })
  }

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: 'admin', subscriptionTier: 'enterprise' },
      select: { id: true, email: true, role: true, subscriptionTier: true },
    })
    return NextResponse.json({ success: true, user })
  } catch {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
}
