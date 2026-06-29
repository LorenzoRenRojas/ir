import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/email'
import { rateLimit, ipKey } from '@/lib/rate-limit'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  // 3 resend attempts per 10 minutes per IP
  const { allowed } = rateLimit(ipKey(req, 'resend'), 3, 10 * 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait before trying again.' }, { status: 429 })
  }

  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, emailVerified: true },
    })

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (user.emailVerified) return NextResponse.json({ error: 'Email already verified' }, { status: 400 })

    // Delete any existing tokens for this user
    await prisma.verificationToken.deleteMany({ where: { identifier: user.email } })

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await prisma.verificationToken.create({
      data: { identifier: user.email, token, expires },
    })

    const baseUrl = process.env.NEXTAUTH_URL ?? 'https://ir-gov.app'
    try {
      await sendVerificationEmail(user.email, token, baseUrl)
    } catch (emailErr) {
      console.error('Verification email send failed:', emailErr)
      return NextResponse.json({ error: 'Failed to send verification email. Please try again later.' }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Resend verification error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
