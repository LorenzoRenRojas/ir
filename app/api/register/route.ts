import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/email'
import { rateLimit, ipKey } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  // 5 registration attempts per 15 minutes per IP
  const { allowed } = rateLimit(ipKey(req, 'register'), 5, 15 * 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait before trying again.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { name, email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name: name ?? null,
        email,
        password: hashedPassword,
      },
      select: { id: true, email: true, name: true },
    })

    // Create verification token and send email (non-blocking — don't fail registration if email fails)
    try {
      const token = crypto.randomBytes(32).toString('hex')
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
      await prisma.verificationToken.create({ data: { identifier: email, token, expires } })
      const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
      await sendVerificationEmail(email, token, baseUrl)
    } catch (emailErr) {
      console.error('Verification email failed (non-fatal):', emailErr)
    }

    return NextResponse.json({ user }, { status: 201 })
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
