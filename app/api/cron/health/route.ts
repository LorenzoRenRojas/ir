import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendAdminAlertEmail } from '@/lib/email'
import { ADMIN_EMAIL } from '@/lib/cron'

export const dynamic = 'force-dynamic'

// Throttle alert emails: even if an uptime monitor hits this every 5 minutes
// while something is down, the admin gets at most one email per 6 hours.
let lastAlertAt = 0
const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000

// Public health endpoint — point a free uptime monitor (e.g. UptimeRobot) at
// this URL. Returns 200 when all systems are up, 503 when degraded, so the
// monitor alerts on status code alone. Also self-alerts the admin by email.
export async function GET() {
  const problems: string[] = []

  // 1. Database
  try {
    await prisma.user.count()
  } catch (err) {
    problems.push(`Database unreachable: ${err instanceof Error ? err.message : String(err)}`)
  }

  // 2. Critical env vars
  if (!process.env.RESEND_API_KEY) problems.push('RESEND_API_KEY is not set — no emails are being sent')
  if (!process.env.SAM_GOV_API_KEY) problems.push('SAM_GOV_API_KEY is not set — dashboard is showing mock contracts')
  if (!process.env.NEXTAUTH_SECRET) problems.push('NEXTAUTH_SECRET is not set — sessions are insecure')

  // 3. SAM.gov reachability (cheap 1-result probe)
  if (process.env.SAM_GOV_API_KEY) {
    try {
      const d = new Date()
      const fmt = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`
      const res = await fetch(
        `https://api.sam.gov/opportunities/v2/search?api_key=${process.env.SAM_GOV_API_KEY}&limit=1&postedFrom=${fmt}&postedTo=${fmt}`,
        { cache: 'no-store', signal: AbortSignal.timeout(10_000) }
      )
      if (res.status === 401 || res.status === 403) {
        problems.push(`SAM.gov API key rejected (${res.status}) — key may have expired`)
      } else if (res.status === 429) {
        // Rate-limited is not "down" — note it but stay healthy
        console.warn('[health] SAM.gov rate limit hit')
      } else if (!res.ok) {
        problems.push(`SAM.gov API returned ${res.status}`)
      }
    } catch (err) {
      problems.push(`SAM.gov unreachable: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const healthy = problems.length === 0

  if (!healthy && ADMIN_EMAIL && process.env.RESEND_API_KEY && Date.now() - lastAlertAt > ALERT_COOLDOWN_MS) {
    try {
      await sendAdminAlertEmail(ADMIN_EMAIL, 'IR health check failing', problems)
      lastAlertAt = Date.now()
    } catch (alertErr) {
      console.error('Admin alert failed:', alertErr)
    }
  }

  return NextResponse.json(
    { healthy, problems, checkedAt: new Date().toISOString() },
    { status: healthy ? 200 : 503 }
  )
}
