import { NextRequest } from 'next/server'

// Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` automatically
// when a CRON_SECRET env var is set on the project. If the secret is set,
// require it — otherwise allow (dev / before the env var is configured).
export function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''
