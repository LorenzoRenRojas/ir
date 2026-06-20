import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Contract } from '@/lib/sam-api'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// POST /api/ai/analyze
// Body: { contracts: Contract[] }
// Returns: { results: { id: string; aiReason: string; aiScore: number }[] }
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const { contracts } = (await req.json()) as { contracts: Contract[] }

    if (!Array.isArray(contracts) || contracts.length === 0) {
      return NextResponse.json({ results: [] })
    }

    // Build company context
    let profileSummary = 'No company profile — evaluate contracts on general merit.'
    if (session?.user?.id) {
      const dbProfile = await prisma.companyProfile.findUnique({
        where: { userId: session.user.id },
        select: { companyName: true, naicsCodes: true, businessTypes: true, certifications: true, geoPrefs: true },
      })
      if (dbProfile) {
        profileSummary = [
          dbProfile.companyName ? `Company: ${dbProfile.companyName}` : null,
          `NAICS codes: ${JSON.parse(dbProfile.naicsCodes).join(', ') || 'none'}`,
          `Business types: ${JSON.parse(dbProfile.businessTypes).join(', ') || 'none'}`,
          `Certifications: ${JSON.parse(dbProfile.certifications).join(', ') || 'none'}`,
          `Geo preferences: ${JSON.parse(dbProfile.geoPrefs).join(', ') || 'any'}`,
        ].filter(Boolean).join(' | ')
      }
    }

    // Batch: one message with all contracts
    const contractList = contracts.slice(0, 20).map((c, i) =>
      `[${i + 1}] ID:${c.id} | "${c.title}" | Agency:${c.agency} | NAICS:${c.naicsCode} ${c.naicsDescription} | SetAside:${c.setAsideDescription || 'None'} | Value:${c.value ? `$${c.value.toLocaleString()}` : 'TBD'} | Deadline:${c.responseDeadline ? new Date(c.responseDeadline).toLocaleDateString() : 'TBD'} | Location:${c.placeOfPerformance || 'TBD'}`
    ).join('\n')

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a government contracting analyst. Given company info and a list of opportunities, return a JSON array with one object per contract.

Company profile: ${profileSummary}

Contracts:
${contractList}

Return ONLY a valid JSON array (no markdown, no explanation) with objects like:
{"id":"<contract id>","aiScore":<0-100>,"aiReason":"<one sentence, max 12 words, why this is or isn't a fit>"}

Score 0-100 based on how well the contract fits the company. If no profile, score on general attractiveness (value, clarity, market).`,
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '[]'
    let results: { id: string; aiScore: number; aiReason: string }[] = []
    try {
      const parsed = JSON.parse(raw)
      results = Array.isArray(parsed) ? parsed : []
    } catch {
      // Try to extract JSON array from text
      const match = raw.match(/\[[\s\S]*\]/)
      if (match) {
        try { results = JSON.parse(match[0]) } catch { results = [] }
      }
    }

    return NextResponse.json({ results })
  } catch (err) {
    console.error('AI analyze error:', err)
    return NextResponse.json({ results: [] })
  }
}
