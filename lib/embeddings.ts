import type { Contract } from './sam-api'

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
const MODEL = 'voyage-3-lite'

export function isEmbeddingEnabled(): boolean {
  return !!process.env.VOYAGE_API_KEY
}

// Cache keys for ContractEmbedding rows are model-versioned: if MODEL ever
// changes, old vectors (possibly a different dimension) must read as cache
// MISSES and re-embed — not silently cosine against mismatched vectors,
// which would flatten every semantic score to neutral with no error.
export function embeddingCacheKey(id: string): string {
  return `${MODEL}:${id}`.slice(0, 190)
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const res = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ input: texts, model: MODEL }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Voyage AI error ${res.status}: ${err}`)
  }
  const data = await res.json()
  return data.data
    .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
    .map((d: { embedding: number[] }) => d.embedding)
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

// Exponential moving average — recent saves count more
export function updatePreferenceVector(
  current: number[] | null,
  newEmbedding: number[],
  alpha = 0.25
): number[] {
  if (!current || current.length !== newEmbedding.length) return [...newEmbedding]
  return current.map((v, i) => (1 - alpha) * v + alpha * newEmbedding[i])
}

// Normalize cosine similarity [-1, 1] → [0, 100]
export function similarityToScore(sim: number): number {
  return Math.round(((sim + 1) / 2) * 100)
}

// Blend metadata score with semantic score based on how many saves exist.
// The more the user has saved, the more we trust the learned preference.
export function blendScores(
  metaScore: number,
  semanticScore: number,
  saveCount: number
): number {
  let semanticWeight: number
  if (saveCount === 0) semanticWeight = 0.3       // cold start: mostly metadata
  else if (saveCount <= 5) semanticWeight = 0.45   // warming up
  else if (saveCount <= 15) semanticWeight = 0.6   // learning
  else semanticWeight = 0.75                        // well-calibrated

  const metaWeight = 1 - semanticWeight
  return Math.round(metaWeight * metaScore + semanticWeight * semanticScore)
}

export function contractToText(c: Contract): string {
  return [
    c.title,
    `Agency: ${c.agency}${c.subAgency && c.subAgency !== c.agency ? ' / ' + c.subAgency : ''}`,
    `NAICS ${c.naicsCode}: ${c.naicsDescription}`,
    `Type: ${c.typeDescription || c.type}`,
    `Set-Aside: ${c.setAsideDescription || 'Open competition'}`,
    c.value ? `Estimated value: $${c.value.toLocaleString()}` : null,
    c.placeOfPerformance ? `Location: ${c.placeOfPerformance}` : null,
    c.description ? c.description.slice(0, 1000) : null,
  ].filter(Boolean).join('\n')
}

export function profileToText(profile: {
  companyName?: string | null
  naicsCodes: string[]
  businessTypes: string[]
  certifications: string[]
  geoPrefs: string[]
  contractVehicles?: string[]
  capabilityStatement?: string | null
  pastPerformance?: string | null
  annualRevenue?: string | null
  orgSize?: string | null
  agencyHistory?: string[]
}): string {
  return [
    profile.companyName ? `Company: ${profile.companyName}` : null,
    profile.businessTypes.length ? `Business type: ${profile.businessTypes.join(', ')}` : null,
    profile.naicsCodes.length ? `NAICS specializations: ${profile.naicsCodes.join(', ')}` : null,
    profile.certifications.length ? `Certifications and clearances: ${profile.certifications.join(', ')}` : null,
    profile.geoPrefs.length ? `Geographic preference: ${profile.geoPrefs.join(', ')}` : null,
    profile.contractVehicles?.length ? `Contract vehicles held: ${profile.contractVehicles.join(', ')}` : null,
    profile.annualRevenue ? `Annual revenue: ${profile.annualRevenue}` : null,
    profile.orgSize ? `Company size: ${profile.orgSize} employees` : null,
    profile.agencyHistory?.length ? `Prior agency experience: ${profile.agencyHistory.join(', ')}` : null,
    profile.capabilityStatement ? `Capabilities: ${profile.capabilityStatement}` : null,
    profile.pastPerformance ? `Past performance: ${profile.pastPerformance}` : null,
  ].filter(Boolean).join('\n')
}
