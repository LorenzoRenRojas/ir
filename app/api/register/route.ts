import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/email'
import { rateLimit, ipKey } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const { allowed } = rateLimit(ipKey(req, 'register'), 5, 15 * 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait before trying again.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { name, password } = body

    if (!body.email || typeof body.email !== 'string' || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }
    // Store emails lowercased — every later lookup (login, reset, verify)
    // normalizes the same way, so casing can never lock a user out
    const email = body.email.toLowerCase().trim()

    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    let user
    try {
      user = await prisma.user.create({
        data: { name: name ?? null, email, password: hashedPassword },
        select: { id: true, email: true, name: true },
      })
    } catch (err) {
      // Unique-constraint race with a concurrent registration
      if ((err as { code?: string })?.code === 'P2002') {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
      }
      throw err
    }

    // Referral attribution — a separate best-effort UPDATE after create, so a
    // pre-migration DB (no referredBy column yet) can never break signup.
    const ref = typeof body.ref === 'string' ? body.ref.trim().slice(0, 40) : ''
    if (ref) {
      try {
        const referrer = await prisma.user.findUnique({
          where: { referralCode: ref },
          select: { id: true },
        })
        if (referrer && referrer.id !== user.id) {
          await prisma.user.update({
            where: { id: user.id },
            data: { referredBy: referrer.id },
            select: { id: true },
          })
        }
      } catch (refErr) {
        console.error('Referral attribution failed (non-fatal):', refErr)
      }
    }

    let emailSent = false
    try {
      const token = crypto.randomBytes(32).toString('hex')
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
      await prisma.verificationToken.create({ data: { identifier: email, token, expires } })
      const baseUrl = process.env.NEXTAUTH_URL ?? 'https://ir-gov.app'
      await sendVerificationEmail(email, token, baseUrl)
      emailSent = true
    } catch (emailErr) {
      console.error('Verification email failed:', emailErr)
    }

    return NextResponse.json({ user, emailSent }, { status: 201 })
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
