import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit, ipKey } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const { allowed } = rateLimit(ipKey(req, 'waitlist'), 5, 15 * 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const normalized = email.toLowerCase().trim()
    await prisma.waitlist.upsert({
      where: { email: normalized },
      update: {},
      create: { email: normalized },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Waitlist error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
