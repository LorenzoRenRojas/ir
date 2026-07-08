import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { fetchContracts, MOCK_CONTRACTS } from '@/lib/sam-api'
import { rateLimit, ipKey } from '@/lib/rate-limit'
import { calculateMatchScore } from '@/lib/matching'
import { prisma } from '@/lib/prisma'
import { fetchIncumbents } from '@/lib/usaspending'
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

    // Load company profile
    let profile = null
    let dbProfile = null
    if (session?.user?.id) {
      dbProfile = await prisma.companyProfile.findUnique({
        where: { userId: session.user.id },
      })
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
    const ENRICH_LIMIT = 40
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
    // fetchIncumbents dedupes by NAICS+agency and caches 24h, but a cold
    // cache across thousands of rows was the main dashboard-lag culprit.
    const enriched = contracts.slice(0, ENRICH_LIMIT)
    try {
      const incumbents = await fetchIncumbents(enriched)
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
        const incumbent = incumbents[i]
        return {
          ...c,
          incumbent,
          ...(winProfile ? { winProbability: calculateWinProbability(c, winProfile, incumbent) } : {}),
        }
      })
    } catch (err) {
      console.error('Enrichment error (non-fatal):', err)
    }

    return NextResponse.json({ contracts })
  } catch (err) {
    console.error('Contracts API error:', err)
    return NextResponse.json({ contracts: MOCK_CONTRACTS })
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
