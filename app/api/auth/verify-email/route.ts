import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWelcomeEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/verify-email?error=missing', req.url))
  }

  try {
    const record = await prisma.verificationToken.findUnique({ where: { token } })

    if (!record) {
      return NextResponse.redirect(new URL('/verify-email?error=invalid', req.url))
    }

    if (record.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token } })
      return NextResponse.redirect(new URL('/verify-email?error=expired', req.url))
    }

    // Mark email as verified and delete the token in one transaction. Guard
    // against re-verification (clicking the link twice) so the welcome email
    // only fires the first time the account actually goes live.
    const wasAlreadyVerified = await prisma.user.findUnique({
      where: { email: record.identifier },
      select: { emailVerified: true, name: true },
    })

    await prisma.$transaction([
      prisma.user.update({
        where: { email: record.identifier },
        data: { emailVerified: new Date() },
        select: { id: true },
      }),
      prisma.verificationToken.delete({ where: { token } }),
    ])

    // Fire-and-forget welcome email — the account is already verified, so a
    // mail hiccup must never block or fail the verification redirect.
    if (!wasAlreadyVerified?.emailVerified) {
      const baseUrl = process.env.NEXTAUTH_URL ?? new URL(req.url).origin
      sendWelcomeEmail(record.identifier, wasAlreadyVerified?.name ?? null, baseUrl)
        .catch((err) => console.error('Welcome email failed (non-fatal):', err))
    }

    return NextResponse.redirect(new URL('/verify-email?success=1', req.url))
  } catch (err) {
    console.error('Email verification error:', err)
    return NextResponse.redirect(new URL('/verify-email?error=server', req.url))
  }
}
