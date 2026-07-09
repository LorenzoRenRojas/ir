import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchContracts, syncContractsToDb } from '@/lib/sam-api'
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

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const problems: string[] = []
  let emailsSent = 0
  let usersProcessed = 0
  // Hobby-plan wall clock is 300s; leave headroom so the admin self-report at
  // the end always runs instead of the function being hard-killed mid-loop
  const startedAt = Date.now()
  const timeBudgetLeft = () => 240_000 - (Date.now() - startedAt)

  // Full-market sync first: a few 1000-row pulls refresh the ContractCache
  // store, so the digest (and every dashboard view today) scores the whole
  // recent market instead of a 100-contract window.
  let syncStats: { synced: number; total: number; pruned: number } | null = null
  try {
    syncStats = await syncContractsToDb()
  } catch (err) {
    problems.push(`Contract sync failed (digest will use existing data): ${err instanceof Error ? err.message : String(err)}`)
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
        problems.push(`Digest stopped at time budget — ${users.length - usersProcessed} users deferred (their contracts stay undigested and send tomorrow)`)
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
        const matches: DigestMatch[] = candidates
          .map(c => ({ contract: c, score: calculateMatchScore(c, profile).total }))
          .filter(m => m.score >= MIN_SCORE)
          .sort((a, b) => b.score - a.score)
          .slice(0, MAX_MATCHES_PER_EMAIL)
          .map(m => ({
            title: m.contract.title,
            agency: m.contract.agency,
            valueFormatted: m.contract.valueFormatted,
            setAsideDescription: m.contract.setAsideDescription,
            responseDeadline: m.contract.responseDeadline,
            matchScore: m.score,
            link: m.contract.link,
          }))

        if (matches.length === 0) continue

        await sendDailyDigestEmail(user.email, user.name, matches, baseUrl, user.id)
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
        problems.push(`Digest to ${user.email} failed: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } catch (err) {
    problems.push(`Digest cron crashed: ${err instanceof Error ? err.message : String(err)}`)
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
        problems.push(`Radar scan stopped at time budget — ${radarUsers.length - radarAlertsSent} users deferred to tomorrow's run`)
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
        problems.push(`Radar alert for ${user.email} failed: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } catch (err) {
    console.error('Recompete scan-and-notify skipped:', err)
  }

  // EmailLog retention: the audit trail grows by every send forever — keep 90 days
  try {
    await prisma.emailLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 90 * 86_400_000) } } })
  } catch { /* table missing pre-migration */ }

  // Self-report: if anything failed, alert the admin so it never fails silently
  if (problems.length > 0 && ADMIN_EMAIL) {
    try {
      await sendAdminAlertEmail(ADMIN_EMAIL, 'Daily digest cron had failures', problems)
    } catch (alertErr) {
      console.error('Admin alert failed:', alertErr)
    }
  }

  return NextResponse.json({ ok: problems.length === 0, usersProcessed, emailsSent, radarAlertsSent, sync: syncStats, problems })
}
