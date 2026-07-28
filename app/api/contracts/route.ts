import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { auth } from '@/lib/auth'
import { fetchContracts } from '@/lib/sam-api'
import { maybeSyncContracts } from '@/lib/contract-refresh'
import { rateLimit, ipKey } from '@/lib/rate-limit'
import { calculateMatchScore, isSetAsideEligible, type CompanyProfile } from '@/lib/matching'
import { prisma } from '@/lib/prisma'
import { fetchIncumbents, fetchSmallBizShares } from '@/lib/usaspending'
import { calculateWinProbability } from '@/lib/win-probability'
import {
  isEmbeddingEnabled,
  embedTexts,
  cosineSimilarity,
  similarityToScore,
  blendScores,
  contractToText,
  profileToText,
  embeddingCacheKey,
} from '@/lib/embeddings'

// Cold path (fresh instance + cold incumbent cache) can exceed the Hobby
// default ~10s — give the route real headroom instead of 504ing
export const maxDuration = 60

export async function GET(req: NextRequest) {
  // 60 requests per minute per IP
  const { allowed } = rateLimit(ipKey(req, 'contracts'), 60, 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)

    const q = searchParams.get('q') ?? ''
    const agency = searchParams.get('agency') ?? ''
    const type = searchParams.get('type') ?? ''
    const setAside = searchParams.get('setAside') ?? ''
    const dueWithin = searchParams.get('dueWithin') ? Number(searchParams.get('dueWithin')) : undefined
    const naics = (searchParams.get('naics') ?? '').replace(/\D/g, '')
    // Personalized eligibility filter — hide set-asides the company can't prime.
    // Default ON; the dashboard offers a "show all" toggle that sends 'false'.
    const eligibleOnly = searchParams.get('eligibleOnly') !== 'false'

    // Load company profile. Guarded: a failed profile read (DB hiccup,
    // unmigrated column) must degrade to an unscored feed, not 503 the
    // whole dashboard — the contract store itself may be perfectly healthy
    let profile: CompanyProfile | null = null
    let dbProfile = null
    try {
      if (session?.user?.id) {
        dbProfile = await prisma.companyProfile.findUnique({
          where: { userId: session.user.id },
        })
      }
    } catch (profileErr) {
      console.error('Company profile load failed (serving unscored feed):', profileErr)
    }
    {
      if (dbProfile) {
        // Guarded parse: one malformed column must degrade to "no preference",
        // not throw into the outer catch (which serves mock data with a 200)
        const parseArr = (s: string): string[] => {
          try {
            const v = JSON.parse(s)
            return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
          } catch {
            return []
          }
        }
        profile = {
          naicsCodes: parseArr(dbProfile.naicsCodes),
          businessTypes: parseArr(dbProfile.businessTypes),
          contractSizePrefs: parseArr(dbProfile.contractSizePrefs),
          contractTypePrefs: parseArr(dbProfile.contractTypePrefs),
          geoPrefs: parseArr(dbProfile.geoPrefs),
          certifications: parseArr(dbProfile.certifications),
        }
      }
    }

    // Keep the store warm off the back of real traffic: after this response is
    // sent, refresh the ContractCache if it's stale or empty. Throttled + locked
    // globally so it never blocks the user and never stampedes SAM.gov's budget.
    // This is what makes logins cold-start-free between scheduled cron syncs.
    after(() => maybeSyncContracts())

    let contracts = await fetchContracts(profile ?? undefined)

    // Filters
    if (q) {
      // Token matching, not whole-phrase substring: "IT support services Army"
      // should hit a notice titled "Army Base IT Support" even though the
      // exact phrase never appears. Keep contracts matching a majority of
      // tokens (all tokens for 1–2 word queries), ranked by hits.
      const tokens = q.toLowerCase().split(/\s+/).filter(t => t.length > 1)
      if (tokens.length > 0) {
        const needed = tokens.length <= 2 ? tokens.length : Math.ceil(tokens.length / 2)
        const hits = (c: (typeof contracts)[number]) => {
          const hay = `${c.title} ${c.agency} ${c.subAgency ?? ''} ${c.naicsDescription ?? ''} ${c.description}`.toLowerCase()
          return tokens.reduce((n, t) => n + (hay.includes(t) ? 1 : 0), 0)
        }
        contracts = contracts
          .map(c => ({ c, h: hits(c) }))
          .filter(x => x.h >= needed)
          .sort((a, b) => b.h - a.h)
          .map(x => x.c)
      }
    }
    if (agency) {
      contracts = contracts.filter((c) =>
        c.agency.toLowerCase().includes(agency.toLowerCase())
      )
    }
    if (type) {
      contracts = contracts.filter((c) =>
        c.type.toLowerCase().includes(type.toLowerCase())
      )
    }
    if (setAside) {
      contracts = contracts.filter((c) =>
        (c.setAsideDescription ?? c.setAsideType ?? '').toLowerCase().includes(setAside.toLowerCase())
      )
    }
    if (naics.length >= 4) {
      // Industry-group (4-digit) match, not exact 6-digit: recompete
      // solicitations often re-post under a sibling code, and this filter's
      // main caller is the Radar's SCAN LIVE RFPs deep link
      const prefix = naics.slice(0, 4)
      contracts = contracts.filter((c) => c.naicsCode.startsWith(prefix))
    }
    if (dueWithin !== undefined && Number.isFinite(dueWithin)) {
      const cutoff = Date.now() + dueWithin * 86_400_000
      contracts = contracts.filter((c) => {
        const dl = new Date(c.responseDeadline).getTime()
        return !isNaN(dl) && dl >= Date.now() && dl <= cutoff
      })
    }

    // Metadata scoring — cheap, runs over the full market
    if (profile) {
      contracts = contracts.map((c) => {
        const breakdown = calculateMatchScore(c, profile!)
        return { ...c, matchScore: breakdown.total, matchBreakdown: breakdown }
      })
    }

    // Personalized eligibility filter: hide set-asides the company can't prime
    // (e.g. an 8(a) sole-source when they aren't 8(a)). Only applied when the
    // company has declared statuses — otherwise we can't judge, so we show all.
    // NAICS/size stay ranking signals, not hard filters: a company can pursue
    // adjacent work or team up, so hiding on those would cost real opportunities.
    let hiddenIneligible = 0
    const canJudgeEligibility =
      !!profile && (profile.businessTypes.length > 0 || profile.certifications.length > 0)
    if (profile && eligibleOnly && canJudgeEligibility) {
      const before = contracts.length
      contracts = contracts.filter((c) => isSetAsideEligible(c, profile!))
      hiddenIneligible = before - contracts.length
    }

    // Personal ranking signal beyond the visible 100-pt score: agencies the
    // company has worked with before rank ahead on ties/near-ties. (Invisible
    // boost — the displayed score stays the honest 4-factor breakdown.)
    let agencyHistory: string[] = []
    try {
      agencyHistory = JSON.parse((dbProfile as { agencyHistory?: string } | null)?.agencyHistory ?? '[]') as string[]
    } catch { /* malformed */ }
    const familiarity = (c: (typeof contracts)[number]) =>
      agencyHistory.length > 0 &&
      agencyHistory.some(a => `${c.agency} ${c.subAgency ?? ''}`.toLowerCase().includes(a.toLowerCase()))
        ? 3
        : 0

    contracts.sort(
      (a, b) => ((b.matchScore ?? 0) + familiarity(b)) - ((a.matchScore ?? 0) + familiarity(a))
    )

    // The store can hold thousands of contracts. Everything below this line
    // costs per-contract work (embeddings, USAspending lookups) or response
    // bytes, so rank on the cheap score first and enrich only the top slice.
    const PAGE_LIMIT = 100
    // Win-probability is computed for this many rows; the *network* enrichment
    // (incumbents + win-share) only fetches for NET_ENRICH_LIMIT to bound the
    // USAspending fan-out that was timing out the feed on cold instances.
    const ENRICH_LIMIT = 40
    const NET_ENRICH_LIMIT = 12
    contracts = contracts.slice(0, PAGE_LIMIT)

    // Semantic + behavioral layer on the visible page (non-fatal)
    if (isEmbeddingEnabled() && session?.user?.id) {
      try {
        contracts = await applySemanticScores(contracts, session.user.id, dbProfile)
        contracts.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
      } catch (err) {
        console.error('Semantic scoring error (non-fatal):', err)
      }
    }

    // Incumbent + win probability for the contracts users actually look at.
    // The USAspending calls (incumbents + win-share) are the dashboard-lag
    // culprit on a cold cache, so they are (a) limited to the top few rows and
    // (b) hard-bounded by a deadline — if the network is slow, the feed still
    // returns with match scores, and enrichment simply fills in what it can.
    const netEnriched = contracts.slice(0, NET_ENRICH_LIMIT)
    let incumbents: (Awaited<ReturnType<typeof fetchIncumbents>>[number])[] = []
    let sbShares = new Map<string, number | null>()
    try {
      const ENRICH_DEADLINE_MS = 6_000
      const result = await Promise.race([
        Promise.all([
          fetchIncumbents(netEnriched),
          fetchSmallBizShares(netEnriched.map((c) => c.naicsCode)),
        ]),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), ENRICH_DEADLINE_MS)),
      ])
      if (result) {
        incumbents = result[0]
        sbShares = result[1]
      } else {
        console.warn('Contract enrichment exceeded deadline — serving scored feed unenriched')
      }
    } catch (err) {
      console.error('Enrichment error (non-fatal):', err)
    }

    const winProfile = profile && dbProfile
      ? {
          businessTypes: profile.businessTypes,
          naicsCodes: profile.naicsCodes,
          certifications: profile.certifications,
          contractVehicles: JSON.parse(dbProfile.contractVehicles ?? '[]') as string[],
          annualRevenue: dbProfile.annualRevenue ?? null,
          agencyHistory: JSON.parse((dbProfile as { agencyHistory?: string }).agencyHistory ?? '[]') as string[],
        }
      : null
    contracts = contracts.map((c, i) => {
      if (i >= ENRICH_LIMIT) return c
      // Incumbent only exists for the network-enriched top slice; win
      // probability still computes for the rest (it degrades gracefully
      // without an incumbent or a win-share signal)
      const incumbent = i < NET_ENRICH_LIMIT ? incumbents[i] : null
      return {
        ...c,
        ...(incumbent ? { incumbent } : {}),
        ...(winProfile ? { winProbability: calculateWinProbability(c, winProfile, incumbent, sbShares.get(c.naicsCode) ?? null) } : {}),
      }
    })

    return NextResponse.json({ contracts, hiddenIneligible, eligibilityFiltered: eligibleOnly && canJudgeEligibility })
  } catch (err) {
    // Honest failure: serving MOCK data with a 200 here made real outages
    // look like a working dashboard full of fabricated contracts. (The
    // no-SAM-key demo fallback lives inside fetchContracts and still works.)
    console.error('Contracts API error:', err)
    // Admins get the real error in the response so production failures are
    // diagnosable from the dashboard itself, without Vercel log access
    let detail: string | undefined
    try {
      const { requireAdmin } = await import('@/lib/admin')
      if (await requireAdmin()) {
        detail = err instanceof Error ? `${err.name}: ${err.message}`.slice(0, 500) : String(err).slice(0, 500)
      }
    } catch { /* admin check unavailable — no detail */ }
    return NextResponse.json(
      { error: 'Live contract data is temporarily unavailable. Please retry in a moment.', ...(detail ? { detail } : {}) },
      { status: 503 }
    )
  }
}

async function applySemanticScores(
  contracts: Awaited<ReturnType<typeof fetchContracts>>,
  userId: string,
  dbProfile: Awaited<ReturnType<typeof prisma.companyProfile.findUnique>>
) {
  const cacheKeys = contracts.map((c) => c.noticeId).filter(Boolean).map(embeddingCacheKey)

  // Fetch cached embeddings (keys are model-versioned — a model change reads
  // as a miss and re-embeds instead of scoring against mismatched vectors)
  const existing = await prisma.contractEmbedding.findMany({
    where: { noticeId: { in: cacheKeys } },
  })
  const embMap = new Map(existing.map((e) => [e.noticeId, JSON.parse(e.embedding) as number[]]))

  // Embed any contracts not yet in DB (batch — one API call)
  const needsEmb = contracts.filter((c) => c.noticeId && !embMap.has(embeddingCacheKey(c.noticeId)))
  if (needsEmb.length > 0) {
    const vectors = await embedTexts(needsEmb.map(contractToText))
    await Promise.all(
      needsEmb.map((c, i) =>
        prisma.contractEmbedding.upsert({
          where: { noticeId: embeddingCacheKey(c.noticeId) },
          update: { embedding: JSON.stringify(vectors[i]) },
          create: { noticeId: embeddingCacheKey(c.noticeId), embedding: JSON.stringify(vectors[i]) },
        })
      )
    )
    needsEmb.forEach((c, i) => embMap.set(embeddingCacheKey(c.noticeId), vectors[i]))
  }

  // Get learned preference vector
  const userEmb = await prisma.userEmbedding.findUnique({ where: { userId } })
  const saveCount = userEmb?.saveCount ?? 0
  let queryVector: number[] | null = userEmb ? JSON.parse(userEmb.preferenceEmbedding) : null

  // Cold start: embed company profile as query vector
  if (!queryVector && dbProfile) {
    const text = profileToText({
      companyName: dbProfile.companyName,
      naicsCodes: JSON.parse(dbProfile.naicsCodes),
      businessTypes: JSON.parse(dbProfile.businessTypes),
      certifications: JSON.parse(dbProfile.certifications),
      geoPrefs: JSON.parse(dbProfile.geoPrefs),
      contractVehicles: JSON.parse(dbProfile.contractVehicles ?? '[]'),
      capabilityStatement: dbProfile.capabilityStatement,
      pastPerformance: dbProfile.pastPerformance,
    })
    if (text.trim()) {
      const [vec] = await embedTexts([text])
      queryVector = vec
    }
  }

  if (!queryVector) return contracts

  return contracts.map((c) => {
    const emb = c.noticeId ? embMap.get(embeddingCacheKey(c.noticeId)) : undefined
    if (!emb) return c
    const sim = cosineSimilarity(queryVector!, emb)
    const semanticScore = similarityToScore(sim)
    const metaScore = c.matchScore ?? 50
    return {
      ...c,
      matchScore: blendScores(metaScore, semanticScore, saveCount),
      semanticScore,
    }
  })
}
