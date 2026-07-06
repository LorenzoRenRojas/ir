import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendAdminAlertEmail } from '@/lib/email'
import { ADMIN_EMAIL } from '@/lib/cron'
import { tryConsumeSamRequests } from '@/lib/sam-quota'
import { requireAdmin } from '@/lib/admin'

export const dynamic = 'force-dynamic'

// Throttle alert emails: even if an uptime monitor hits this every 5 minutes
// while something is down, the admin gets at most one email per 6 hours.
let lastAlertAt = 0
const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000

// SAM.gov probe state — probing costs quota, so probe rarely and reuse the result
let lastSamProbeAt = 0
let lastSamProbeResult: string | null = null
const SAM_PROBE_INTERVAL_MS = 6 * 60 * 60 * 1000

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

  // 3. SAM.gov reachability — throttled to once per 6h per instance.
  // NEVER probe on every hit: uptime monitors ping this endpoint every few
  // minutes, and each probe costs a SAM.gov API request against a small daily
  // quota. An unthrottled probe here can burn the whole quota and force the
  // entire app onto mock data.
  if (
    process.env.SAM_GOV_API_KEY &&
    Date.now() - lastSamProbeAt > SAM_PROBE_INTERVAL_MS &&
    (await tryConsumeSamRequests(1))
  ) {
    lastSamProbeAt = Date.now()
    try {
      const d = new Date()
      const fmt = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`
      const res = await fetch(
        `https://api.sam.gov/opportunities/v2/search?api_key=${process.env.SAM_GOV_API_KEY}&limit=1&postedFrom=${fmt}&postedTo=${fmt}`,
        { cache: 'no-store', signal: AbortSignal.timeout(10_000) }
      )
      if (res.status === 401 || res.status === 403) {
        lastSamProbeResult = `SAM.gov API key rejected (${res.status}) — key may have expired`
      } else if (res.status === 429) {
        lastSamProbeResult = 'SAM.gov daily rate limit exhausted — live contract data unavailable until the quota resets'
      } else if (!res.ok) {
        lastSamProbeResult = `SAM.gov API returned ${res.status}`
      } else {
        lastSamProbeResult = null
      }
    } catch (err) {
      lastSamProbeResult = `SAM.gov unreachable: ${err instanceof Error ? err.message : String(err)}`
    }
  }
  if (lastSamProbeResult) problems.push(lastSamProbeResult)

  const healthy = problems.length === 0

  if (!healthy && ADMIN_EMAIL && process.env.RESEND_API_KEY && Date.now() - lastAlertAt > ALERT_COOLDOWN_MS) {
    // Double-check the cooldown against Kv: module state resets on every
    // serverless cold start, and an outage + 5-min uptime pings would
    // otherwise send one alert per cold instance and drain the Resend quota
    let kvAllows = true
    try {
      const row = await prisma.kv.findUnique({ where: { key: 'health-alert-at' } })
      if (row && Date.now() - parseInt(row.value, 10) < ALERT_COOLDOWN_MS) kvAllows = false
    } catch { /* Kv missing or DB down — in-memory throttle still applies */ }

    if (kvAllows) {
      try {
        await sendAdminAlertEmail(ADMIN_EMAIL, 'IR health check failing', problems)
        lastAlertAt = Date.now()
        try {
          await prisma.kv.upsert({
            where: { key: 'health-alert-at' },
            update: { value: String(Date.now()) },
            create: { key: 'health-alert-at', value: String(Date.now()) },
          })
        } catch { /* best-effort */ }
      } catch (alertErr) {
        console.error('Admin alert failed:', alertErr)
      }
    }
  }

  // Public response is status-code-only: uptime monitors alert on the 503,
  // the admin email carries the specifics. Enumerating missing env vars or
  // quota state here would hand recon data to anyone who finds the URL —
  // only a logged-in admin (the dashboard's health button) gets the detail.
  const isAdmin = !healthy && (await requireAdmin().catch(() => null))
  return NextResponse.json(
    { healthy, ...(isAdmin ? { problems } : {}), checkedAt: new Date().toISOString() },
    { status: healthy ? 200 : 503 }
  )
}
