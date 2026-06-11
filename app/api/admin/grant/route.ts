import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')
  const email = searchParams.get('email')

  if (key !== process.env.MIGRATION_KEY || !key) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!email) {
    return NextResponse.json({ error: 'email param required' }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { email },
    data: { role: 'admin', subscriptionTier: 'enterprise' },
    select: { id: true, email: true, role: true, subscriptionTier: true },
  })

  return NextResponse.json({ success: true, user })
}
