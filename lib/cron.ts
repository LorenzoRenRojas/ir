import { NextRequest } from 'next/server'

// Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` automatically
// when a CRON_SECRET env var is set on the project. In production a missing
// secret fails CLOSED — an open cron endpoint means anyone can trigger
// duplicate email sends and burn the SAM quota. Dev stays open.
export function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== 'production'
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''
