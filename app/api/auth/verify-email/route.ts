import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    // Mark email as verified and delete the token in one transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { email: record.identifier },
        data: { emailVerified: new Date() },
      }),
      prisma.verificationToken.delete({ where: { token } }),
    ])

    return NextResponse.redirect(new URL('/verify-email?success=1', req.url))
  } catch (err) {
    console.error('Email verification error:', err)
    return NextResponse.redirect(new URL('/verify-email?error=server', req.url))
  }
}
