import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { fetchContracts, MOCK_CONTRACTS } from '@/lib/sam-api'
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
} from '@/lib/embeddings'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const { searchParams } = new URL(req.url)

    const q = searchParams.get('q') ?? ''
    const agency = searchParams.get('agency') ?? ''
    const type = searchParams.get('type') ?? ''
    const setAside = searchParams.get('setAside') ?? ''
    const minValue = searchParams.get('minValue') ? Number(searchParams.get('minValue')) : undefined
    const maxValue = searchParams.get('maxValue') ? Number(searchParams.get('maxValue')) : undefined

    // Load company profile
    let profile = null
    let dbProfile = null
    if (session?.user?.id) {
      dbProfile = await prisma.companyProfile.findUnique({
        where: { userId: session.user.id },
      })
      if (dbProfile) {
        profile = {
          naicsCodes: JSON.parse(dbProfile.naicsCodes) as string[],
          businessTypes: JSON.parse(dbProfile.businessTypes) as string[],
          contractSizePrefs: JSON.parse(dbProfile.contractSizePrefs) as string[],
          contractTypePrefs: JSON.parse(dbProfile.contractTypePrefs) as string[],
          geoPrefs: JSON.parse(dbProfile.geoPrefs) as string[],
          certifications: JSON.parse(dbProfile.certifications) as string[],
        }
      }
    }

    let contracts = await fetchContracts(profile ?? undefined)

    // Filters
    if (q) {
      const kw = q.toLowerCase()
      contracts = contracts.filter(
        (c) =>
          c.title.toLowerCase().includes(kw) ||
          c.agency.toLowerCase().includes(kw) ||
          c.description.toLowerCase().includes(kw)
      )
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
    if (minValue !== undefined) {
      contracts = contracts.filter((c) => (c.value ?? 0) >= minValue)
    }
    if (maxValue !== undefined) {
      contracts = contracts.filter((c) => (c.value ?? 0) <= maxValue)
    }

    // Metadata scoring
    if (profile) {
      contracts = contracts.map((c) => {
        const breakdown = calculateMatchScore(c, profile!)
        return { ...c, matchScore: breakdown.total, matchBreakdown: breakdown }
      })
    }

    // Semantic + behavioral layer (non-fatal — falls back to metadata if unavailable)
    if (isEmbeddingEnabled() && session?.user?.id) {
      try {
        contracts = await applySemanticScores(contracts, session.user.id, dbProfile)
      } catch (err) {
        console.error('Semantic scoring error (non-fatal):', err)
      }
    }

    contracts.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))

    // Fetch incumbent data, deduped by NAICS+agency, cached 24h
    const incumbents = await fetchIncumbents(contracts)
    contracts = contracts.map((c, i) => ({ ...c, incumbent: incumbents[i] }))

    // Calculate win probability if we have a profile
    if (profile && dbProfile) {
      const winProfile = {
        businessTypes: profile.businessTypes,
        naicsCodes: profile.naicsCodes,
        certifications: profile.certifications,
        contractVehicles: JSON.parse(dbProfile.contractVehicles ?? '[]') as string[],
        annualRevenue: dbProfile.annualRevenue ?? null,
        agencyHistory: JSON.parse((dbProfile as { agencyHistory?: string }).agencyHistory ?? '[]') as string[],
      }
      contracts = contracts.map((c, i) => ({
        ...c,
        winProbability: calculateWinProbability(c, winProfile, incumbents[i]),
      }))
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
  const noticeIds = contracts.map((c) => c.noticeId).filter(Boolean)

  // Fetch cached embeddings
  const existing = await prisma.contractEmbedding.findMany({
    where: { noticeId: { in: noticeIds } },
  })
  const embMap = new Map(existing.map((e) => [e.noticeId, JSON.parse(e.embedding) as number[]]))

  // Embed any contracts not yet in DB (batch — one API call)
  const needsEmb = contracts.filter((c) => c.noticeId && !embMap.has(c.noticeId))
  if (needsEmb.length > 0) {
    const vectors = await embedTexts(needsEmb.map(contractToText))
    await Promise.all(
      needsEmb.map((c, i) =>
        prisma.contractEmbedding.upsert({
          where: { noticeId: c.noticeId },
          update: { embedding: JSON.stringify(vectors[i]) },
          create: { noticeId: c.noticeId, embedding: JSON.stringify(vectors[i]) },
        })
      )
    )
    needsEmb.forEach((c, i) => embMap.set(c.noticeId, vectors[i]))
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
    const emb = c.noticeId ? embMap.get(c.noticeId) : undefined
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
