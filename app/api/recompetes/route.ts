import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getRecompetes, type RecompeteAward } from '@/lib/usaspending'
import { isEmbeddingEnabled, embedTexts, cosineSimilarity } from '@/lib/embeddings'

export const maxDuration = 120

export interface RecompeteScoreParts {
  timing: number // /35 — distance to the positioning sweet spot
  size: number // /25 — award value vs the sizes you pursue
  agency: number // /20 — have you worked with this agency before
  taste: number // /20 — learned similarity to what you save (Voyage)
}

interface ScoredRecompete extends RecompeteAward {
  recompeteScore: number
  scoreParts: RecompeteScoreParts
}

function timingScore(months: number): number {
  if (months >= 6 && months <= 12) return 35 // the positioning sweet spot
  if (months >= 3 && months < 6) return 28 // tight but workable
  if (months > 12) return 22 // early intel — track it
  return 16 // 0–3mo: recompete likely already in motion
}

const SIZE_BANDS: { pattern: RegExp; range: [number, number] }[] = [
  { pattern: /micro/i, range: [0, 10_000] },
  { pattern: /simplified/i, range: [10_000, 250_000] },
  { pattern: /mid/i, range: [250_000, 5_000_000] },
  { pattern: /large/i, range: [5_000_000, 50_000_000] },
  { pattern: /major/i, range: [50_000_000, Infinity] },
]

function sizeScore(prefs: string[], amount: number | null): number {
  if (prefs.length === 0 || prefs.some(p => /any/i.test(p))) return prefs.length === 0 ? 13 : 25
  if (!amount) return 13
  const band = SIZE_BANDS.findIndex(b => amount >= b.range[0] && amount < b.range[1])
  let best = Infinity
  for (const pref of prefs) {
    const idx = SIZE_BANDS.findIndex(b => b.pattern.test(pref))
    if (idx >= 0 && band >= 0) best = Math.min(best, Math.abs(idx - band))
  }
  return best === 0 ? 25 : best === 1 ? 13 : 5
}

function agencyScore(history: string[], award: RecompeteAward): number {
  if (history.length === 0) return 8
  const hay = `${award.agency} ${award.subAgency}`.toLowerCase()
  return history.some(a => hay.includes(a.toLowerCase())) ? 20 : 8
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await prisma.companyProfile.findUnique({
      where: { userId: session.user.id },
      select: { naicsCodes: true, contractSizePrefs: true, agencyHistory: true },
    })

    const parseArr = (s: string | undefined | null): string[] => {
      try {
        const v = JSON.parse(s ?? '[]')
        return Array.isArray(v) ? v : []
      } catch {
        return []
      }
    }

    const naicsCodes = parseArr(profile?.naicsCodes)
    if (naicsCodes.length === 0) {
      return NextResponse.json(
        { error: 'Add NAICS codes to your company profile to see expiring contracts in your space.' },
        { status: 400 }
      )
    }
    const sizePrefs = parseArr(profile?.contractSizePrefs)
    const agencyHistory = parseArr(profile?.agencyHistory)

    const awards = await getRecompetes(naicsCodes.slice(0, 8))

    // Taste layer: cosine similarity between each award and the user's learned
    // preference vector. Award embeddings are cached permanently (one Voyage
    // call per award EVER, shared across all users); missing vector → neutral.
    const tasteByAward = new Map<string, number>()
    if (isEmbeddingEnabled() && awards.length > 0) {
      try {
        const userEmb = await prisma.userEmbedding.findUnique({ where: { userId: session.user.id } })
        if (userEmb) {
          const userVec = JSON.parse(userEmb.preferenceEmbedding) as number[]
          const keys = awards.map(a => `award:${a.awardId}`.slice(0, 190))
          const cached = await prisma.contractEmbedding.findMany({ where: { noticeId: { in: keys } } })
          const embMap = new Map(cached.map(e => [e.noticeId, JSON.parse(e.embedding) as number[]]))

          const uncached = awards.filter((a, i) => !embMap.has(keys[i])).slice(0, 128)
          if (uncached.length > 0) {
            const vectors = await embedTexts(
              uncached.map(a => `${a.description}. Agency: ${a.subAgency || a.agency}. Incumbent: ${a.incumbent}.`)
            )
            await Promise.all(
              uncached.map((a, i) => {
                const key = `award:${a.awardId}`.slice(0, 190)
                embMap.set(key, vectors[i])
                return prisma.contractEmbedding.upsert({
                  where: { noticeId: key },
                  update: { embedding: JSON.stringify(vectors[i]) },
                  create: { noticeId: key, embedding: JSON.stringify(vectors[i]) },
                })
              })
            )
          }

          for (let i = 0; i < awards.length; i++) {
            const vec = embMap.get(keys[i])
            if (vec) {
              const sim = cosineSimilarity(userVec, vec)
              tasteByAward.set(awards[i].awardId, Math.round(((sim + 1) / 2) * 20))
            }
          }
        }
      } catch (err) {
        console.error('Recompete taste scoring skipped (non-fatal):', err)
      }
    }

    const scored: ScoredRecompete[] = awards.map(a => {
      const parts: RecompeteScoreParts = {
        timing: timingScore(a.monthsUntilExpiry),
        size: sizeScore(sizePrefs, a.amount),
        agency: agencyScore(agencyHistory, a),
        taste: tasteByAward.get(a.awardId) ?? 10,
      }
      return {
        ...a,
        scoreParts: parts,
        recompeteScore: parts.timing + parts.size + parts.agency + parts.taste,
      }
    })

    scored.sort((a, b) => b.recompeteScore - a.recompeteScore)

    return NextResponse.json({ recompetes: scored, naicsCodes: naicsCodes.slice(0, 8) })
  } catch (err) {
    console.error('GET /api/recompetes error:', err)
    const detail = err instanceof Error ? err.message.slice(0, 300) : ''
    return NextResponse.json({ error: `USAspending.gov request failed. ${detail}` }, { status: 502 })
  }
}
