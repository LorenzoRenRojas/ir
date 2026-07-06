import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import { rateLimit, ipKey } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  // 3 attempts per 15 minutes per IP — prevent email enumeration at scale
  const { allowed } = rateLimit(ipKey(req, 'forgot'), 3, 15 * 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait before trying again.' }, { status: 429 })
  }

  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Normalize ONCE and use everywhere — the token identifier must match the
    // stored (lowercased) account email exactly, or reset-password's
    // user.update({ where: { email } }) throws and the reset never works
    const normalized = email.toLowerCase().trim()

    // Always return success to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email: normalized } })
    if (!user || !user.password) {
      // No account or Google-only account — return success anyway
      return NextResponse.json({ success: true })
    }

    // Delete any existing reset tokens for this email
    await prisma.verificationToken.deleteMany({ where: { identifier: `reset:${normalized}` } })

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.verificationToken.create({
      data: { identifier: `reset:${normalized}`, token, expires },
    })

    const baseUrl = process.env.NEXTAUTH_URL ?? 'https://ir-gov.app'
    await sendPasswordResetEmail(normalized, token, baseUrl)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Forgot password error:', err)
    // Return success even on server error to prevent enumeration
    return NextResponse.json({ success: true })
  }
}
