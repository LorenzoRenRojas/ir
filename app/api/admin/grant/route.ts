import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(req: Request) {
  // Must be an existing admin session — key alone is not sufficient
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
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
