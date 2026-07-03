import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Set to true to show coming soon page to the public
const COMING_SOON = true

// Pages that bypass the coming soon gate (auth flows still work)
const COMING_SOON_BYPASS = [
  '/coming-soon',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/terms',
  '/privacy',
  '/naics',
  '/capabilities',
  '/security',
  '/sitemap.xml',
  '/robots.txt',
]

// Pages that require authentication
const AUTH_REQUIRED = [
  '/dashboard',
  '/saved',
  '/settings',
  '/team',
  '/documents',
  '/contracts',
  '/onboarding',
  '/admin',
  '/recompetes',
]

// Pages that a logged-in but unverified user is allowed to see
const ALLOWED_UNVERIFIED = ['/onboarding', '/verify-email']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Coming soon gate — redirect public traffic, let auth flows through
  if (COMING_SOON) {
    const bypassed = COMING_SOON_BYPASS.some(
      (p) => pathname === p || pathname.startsWith(p + '/')
    )
    if (!bypassed) {
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
      if (!token) {
        return NextResponse.redirect(new URL('/coming-soon', req.url))
      }
    }
  }

  const needsAuth = AUTH_REQUIRED.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
  if (!needsAuth) return NextResponse.next()

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // Not logged in — send to login
  if (!token) {
    const url = new URL('/login', req.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  // Logged in but email not verified — redirect to pending page
  // (Google OAuth users are always verified; only Credentials users may be unverified)
  const emailVerified = token.emailVerified as string | null | undefined
  const allowedUnverified = ALLOWED_UNVERIFIED.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
  if (!emailVerified && !allowedUnverified) {
    return NextResponse.redirect(new URL('/verify-email/pending', req.url))
  }

  return NextResponse.next()
}

export const config = {
  // Run on all pages except Next.js internals, static files, and API routes
  // API routes do their own auth checks
  matcher: [
    '/((?!api|_next/static|_next/image|favicon|icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
