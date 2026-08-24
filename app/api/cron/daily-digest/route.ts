import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchContracts } from '@/lib/sam-api'
import { maybeSyncContracts } from '@/lib/contract-refresh'
import { calculateMatchScore, type CompanyProfile } from '@/lib/matching'
import { sendDailyDigestEmail, sendAdminAlertEmail, type DigestMatch } from '@/lib/email'
import { isAuthorizedCron, ADMIN_EMAIL } from '@/lib/cron'

export const maxDuration = 300

const MIN_SCORE = 55
const MAX_MATCHES_PER_EMAIL = 5
// Contracts posted within this window count as "new" (48h gives slack for
// once-daily crons whose exact run time drifts on the Hobby plan)
const FRESH_WINDOW_MS = 48 * 60 * 60 * 1000

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    // Element types matter: a number in the array would crash .slice() calls
    // deep inside scoring — and one bad profile must never kill the loop
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

// SAM.gov set-aside codes that reserve work for small businesses (any flavor)
const SMALL_BIZ_SET_ASIDES = new Set([
  'SBA', 'SBP', '8A', '8AN', 'SDVOSBC', 'SDVOSBS', 'WOSB', 'WOSBSS',
  'EDWOSB', 'EDWOSBSS', 'HZC', 'HZS', 'VSA', 'VSS',
])

// One forwardable sentence about the user's market, computed in memory from
// the store we already fetched — no extra API calls, no extra queries.
function marketPulse(all: { naicsCode: string; setAsideType: string }[], userNaics: string[]): string | undefined {
  if (userNaics.length === 0) return undefined
  const prefixes = [...new Set(userNaics.map(n => n.slice(0, 4)).filter(p => p.length === 4))]
  if (prefixes.length === 0) return undefined
  const mine = all.filter(c => c.naicsCode && prefixes.some(p => c.naicsCode.startsWith(p)))
  if (mine.length < 5) return undefined // too thin to be a meaningful stat
  const setAside = mine.filter(c => SMALL_BIZ_SET_ASIDES.has((c.setAsideType || '').toUpperCase())).length
  const pct = Math.round((setAside / mine.length) * 100)
  return pct > 0
    ? `${mine.length} opportunities are live in your NAICS codes right now — ${pct}% of them are set aside for small businesses.`
    : `${mine.length} opportunities are live in your NAICS codes right now.`
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Two buckets, deliberately separate:
  //   problems  → genuinely broken. These PAGE the admin by email.
  //   degraded  → load-shedding, a single bad recipient, an external API blip.
  //               Logged for the record, but never emailed — so an [IR ALERT]
  //               in the inbox always means something actually needs attention.
  const problems: string[] = []
  const degraded: string[] = []
  let emailsSent = 0
  let usersProcessed = 0
  let digestFailures = 0 // per-recipient send failures; systemic only if ALL fail
  // Hobby-plan wall clock is 300s; leave headroom so the admin self-report at
  // the end always runs instead of the function being hard-killed mid-loop
  const startedAt = Date.now()
  const timeBudgetLeft = () => 240_000 - (Date.now() - startedAt)

  // Full-market sync first: a few 1000-row pulls refresh the ContractCache
  // store, so the digest (and every dashboard view today) scores the whole
  // recent market instead of a 100-contract window.
  // Goes through maybeSyncContracts so the shared throttle/lock timestamp stays
  // coherent with the dedicated sync cron and traffic-driven background refresh.
  let syncStats: { synced: number; total: number; pruned: number } | null = null
  try {
    const r = await maybeSyncContracts({ force: true })
    syncStats = r.stats ?? null
  } catch (err) {
    // Non-fatal: the digest just runs on the existing store instead.
    degraded.push(`Contract sync failed (digest used existing data): ${err instanceof Error ? err.message : String(err)}`)
  }

  try {
    const contracts = await fetchContracts()
    const cutoff = Date.now() - FRESH_WINDOW_MS
    const fresh = contracts.filter(c => {
      const posted = new Date(c.postedDate).getTime()
      return !isNaN(posted) && posted >= cutoff
    })

    // No early return here — even with nothing fresh to digest, the radar
    // alerts and pre-embedding below must still run today.
    const users = fresh.length === 0 ? [] : await prisma.user.findMany({
      where: { emailVerified: { not: null }, companyProfile: { isNot: null }, notifyDigest: true },
      select: { id: true, email: true, name: true, companyProfile: true },
    })

    const baseUrl = process.env.NEXTAUTH_URL ?? 'https://ir-gov.app'

    for (const user of users) {
      if (timeBudgetLeft() <= 0) {
        degraded.push(`Digest stopped at time budget — ${users.length - usersProcessed} users deferred (their contracts stay undigested and send tomorrow)`)
        break
      }
      usersProcessed++
      // Whole per-user body inside the try: one corrupt profile or one
      // scoring crash must skip THIS user, not everyone after them
      try {
        const cp = user.companyProfile!
        const profile: CompanyProfile = {
          naicsCodes: parseJsonArray(cp.naicsCodes),
          businessTypes: parseJsonArray(cp.businessTypes),
          contractSizePrefs: parseJsonArray(cp.contractSizePrefs),
          contractTypePrefs: parseJsonArray(cp.contractTypePrefs),
          geoPrefs: parseJsonArray(cp.geoPrefs),
          certifications: parseJsonArray(cp.certifications),
          clearanceLevel: cp.clearanceLevel ?? undefined,
        }

        // Never digest the same notice to the same user twice — the 48h fresh
        // window overlaps consecutive daily runs by design, so dedupe per user
        const digestKey = `digest-sent:${user.id}`
        let alreadySent: string[] = []
        try {
          const row = await prisma.kv.findUnique({ where: { key: digestKey } })
          if (row) alreadySent = JSON.parse(row.value) as string[]
        } catch { /* Kv missing pre-migration */ }
        const sentSet = new Set(alreadySent)

        const candidates = fresh.filter(c => !sentSet.has(c.noticeId))

        // Watchlist keywords — terms the user explicitly asked to be told
        // about. A keyword hit is included regardless of profile score,
        // because the user's own words outrank our heuristics.
        let watchTerms: string[] = []
        try {
          const row = await prisma.kv.findUnique({ where: { key: `watch:${user.id}` } })
          if (row) watchTerms = parseJsonArray(row.value).map(t => t.toLowerCase()).filter(t => t.length >= 3)
        } catch { /* Kv missing pre-migration */ }
        const watchHitIds = new Set<string>()
        if (watchTerms.length > 0) {
          for (const c of candidates) {
            const hay = `${c.title} ${c.description ?? ''}`.toLowerCase()
            if (watchTerms.some(t => hay.includes(t))) watchHitIds.add(c.noticeId)
          }
        }

        const scored = candidates.map(c => ({ contract: c, score: calculateMatchScore(c, profile).total }))
        const profileMatches = scored
          .filter(m => m.score >= MIN_SCORE)
          .sort((a, b) => b.score - a.score)
          .slice(0, MAX_MATCHES_PER_EMAIL)
        // Watchlist hits ride along even under the score floor (capped at 3
        // extra so one broad keyword can't flood the email)
        const watchExtras = scored
          .filter(m => watchHitIds.has(m.contract.noticeId) && !profileMatches.includes(m))
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)

        const matches: DigestMatch[] = [...profileMatches, ...watchExtras].map(m => ({
          title: m.contract.title,
          agency: m.contract.agency,
          valueFormatted: m.contract.valueFormatted,
          setAsideDescription: m.contract.setAsideDescription,
          responseDeadline: m.contract.responseDeadline,
          matchScore: m.score,
          link: m.contract.link,
          ...(watchHitIds.has(m.contract.noticeId) ? { watchlist: true } : {}),
        }))

        if (matches.length === 0) continue

        const pulse = marketPulse(contracts, profile.naicsCodes)
        await sendDailyDigestEmail(user.email, user.name, matches, baseUrl, user.id, pulse)
        emailsSent++

        const sentIds = candidates
          .filter(c => matches.some(m => m.link === c.link))
          .map(c => c.noticeId)
        const updated = [...new Set([...alreadySent, ...sentIds])].slice(-800)
        try {
          await prisma.kv.upsert({
            where: { key: digestKey },
            update: { value: JSON.stringify(updated) },
            create: { key: digestKey, value: JSON.stringify(updated) },
          })
        } catch { /* best-effort */ }
      } catch (err) {
        // One bad recipient must not page the admin — everyone else still got
        // their digest. Only a total wipe-out (below) is worth an alert.
        digestFailures++
        degraded.push(`Digest to ${user.email} failed: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } catch (err) {
    problems.push(`Digest cron crashed: ${err instanceof Error ? err.message : String(err)}`)
  }

  // Escalation: a single bounce is noise, but every send failing with none
  // succeeding is systemic (revoked Resend key, spent quota) — page for that.
  if (digestFailures > 0 && emailsSent === 0) {
    problems.push(`All ${digestFailures} digest email(s) failed to send with none succeeding — likely a systemic email problem (Resend key or quota), not a single bad recipient.`)
  }

  // Pre-embed fresh contracts so the dashboard's semantic layer is always a
  // cache hit — embedding happens here, off every user's request path.
  try {
    const { isEmbeddingEnabled, embedTexts, contractToText, embeddingCacheKey } = await import('@/lib/embeddings')
    if (isEmbeddingEnabled()) {
      const contracts = await fetchContracts()
      const ids = contracts.map(c => c.noticeId).filter(Boolean).map(embeddingCacheKey)
      const existing = await prisma.contractEmbedding.findMany({
        where: { noticeId: { in: ids } },
        select: { noticeId: true },
      })
      const have = new Set(existing.map(e => e.noticeId))
      const missing = contracts.filter(c => c.noticeId && !have.has(embeddingCacheKey(c.noticeId))).slice(0, 512)
      for (let i = 0; i < missing.length; i += 128) {
        const batch = missing.slice(i, i + 128)
        const vectors = await embedTexts(batch.map(contractToText))
        await Promise.all(
          batch.map((c, j) =>
            prisma.contractEmbedding.upsert({
              where: { noticeId: embeddingCacheKey(c.noticeId) },
              update: { embedding: JSON.stringify(vectors[j]) },
              create: { noticeId: embeddingCacheKey(c.noticeId), embedding: JSON.stringify(vectors[j]) },
            })
          )
        )
      }
    }
  } catch (err) {
    console.error('Contract pre-embedding skipped (non-fatal):', err)
  }

  // Recompete Radar: daily scan + notify. For every user, refresh their radar
  // (warms the 24h Kv cache for the tab too), diff against the award IDs
  // they've already been alerted about, and email only what's NEW. USAspending
  // is free and keyless — the scan costs nothing but cron time.
  let radarAlertsSent = 0
  try {
    const { getRecompetes } = await import('@/lib/usaspending')
    const { sendRecompeteAlertEmail } = await import('@/lib/email')
    const radarUsers = await prisma.user.findMany({
      where: { emailVerified: { not: null }, companyProfile: { isNot: null }, notifyRadar: true },
      select: { id: true, email: true, name: true, companyProfile: { select: { naicsCodes: true } } },
    })

    const baseUrl = process.env.NEXTAUTH_URL ?? 'https://ir-gov.app'

    // Rotate the starting point daily: if the time budget cuts the loop
    // short, it must not starve the SAME tail users every single day
    const rot = radarUsers.length > 0 ? new Date().getUTCDate() % radarUsers.length : 0
    const rotatedUsers = [...radarUsers.slice(rot), ...radarUsers.slice(0, rot)]

    for (const user of rotatedUsers) {
      if (timeBudgetLeft() <= 0) {
        degraded.push(`Radar scan stopped at time budget — ${radarUsers.length - radarAlertsSent} users deferred to tomorrow's run`)
        break
      }
      try {
        let codes: string[] = []
        try {
          codes = (JSON.parse(user.companyProfile!.naicsCodes) as string[]).slice(0, 8)
        } catch { /* malformed json */ }
        if (codes.length === 0) continue

        const recompetes = await getRecompetes(codes)
        if (recompetes.length === 0) continue

        // Which awards has this user already been told about?
        const seenKey = `recompete-alerted:${user.id}`
        let seen: string[] = []
        try {
          const row = await prisma.kv.findUnique({ where: { key: seenKey } })
          if (row) seen = JSON.parse(row.value) as string[]
        } catch { /* Kv missing pre-migration — alert on everything once */ }
        const seenSet = new Set(seen)

        const fresh = recompetes.filter(r => !seenSet.has(r.awardId))
        if (fresh.length === 0) continue

        // Alert on the most urgent/valuable new ones; record ALL as seen
        const toSend = fresh.slice(0, 8).map(r => ({
          description: r.description,
          incumbent: r.incumbent,
          amount: r.amount,
          endDate: r.endDate,
          monthsUntilExpiry: r.monthsUntilExpiry,
          agency: r.subAgency || r.agency,
        }))

        await sendRecompeteAlertEmail(user.email, user.name, toSend, baseUrl, user.id)
        radarAlertsSent++

        const updatedSeen = [...new Set([...seen, ...fresh.map(r => r.awardId)])].slice(-800)
        try {
          await prisma.kv.upsert({
            where: { key: seenKey },
            update: { value: JSON.stringify(updatedSeen) },
            create: { key: seenKey, value: JSON.stringify(updatedSeen) },
          })
        } catch { /* best-effort */ }
      } catch (err) {
        degraded.push(`Radar alert for ${user.email} failed: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } catch (err) {
    // USAspending is an external, keyless API — a blip here is degraded, not
    // broken. Record it, but don't page for someone else's downtime.
    degraded.push(`Recompete radar scan skipped: ${err instanceof Error ? err.message : String(err)}`)
    console.error('Recompete scan-and-notify skipped:', err)
  }

  // Ground-truth collection. Runs last and strictly inside the leftover time
  // budget: this dataset compounds over months, so a short run today costs
  // nothing, while delaying a single user's digest would cost something real.
  let outcomeStats: unknown = null
  try {
    const left = timeBudgetLeft()
    if (left > 20_000) {
      const { collectOutcomes } = await import('@/lib/outcomes')
      outcomeStats = await collectOutcomes({ limit: 40, timeBudgetMs: Math.min(left - 10_000, 60_000) })
    } else {
      degraded.push('Outcome collection skipped — no time budget left this run.')
    }
  } catch (err) {
    degraded.push(`Outcome collection failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  // EmailLog retention: the audit trail grows by every send forever — keep 90 days
  try {
    await prisma.emailLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 90 * 86_400_000) } } })
  } catch { /* table missing pre-migration */ }

  // Degraded issues are kept in the run record and server logs, but never
  // emailed — paging on load-shedding or a single bounce trains you to ignore
  // the alert, which defeats its purpose.
  if (degraded.length > 0) {
    console.warn('[daily-digest] degraded (non-paging):', degraded)
  }

  // Only genuinely broken things page the admin. When we do send, attach the
  // degraded list as context so the alert carries the full picture of the run.
  if (problems.length > 0 && ADMIN_EMAIL) {
    const body = degraded.length > 0
      ? [...problems, '—', 'Also degraded this run (informational, not the alert cause):', ...degraded]
      : problems
    try {
      await sendAdminAlertEmail(ADMIN_EMAIL, 'Daily digest cron had failures', body)
    } catch (alertErr) {
      console.error('Admin alert failed:', alertErr)
    }
  }

  return NextResponse.json({ ok: problems.length === 0, usersProcessed, emailsSent, radarAlertsSent, sync: syncStats, outcomes: outcomeStats, problems, degraded })
}
