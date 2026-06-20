import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Contract } from '@/lib/sam-api'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface AIDetailAnalysis {
  fitSummary: string
  strengths: string[]
  risks: string[]
  competitionNotes: string
  nextSteps: string[]
  winProbability: number
}

// POST /api/ai/analyze/detail
// Body: { contract: Contract }
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const { contract } = (await req.json()) as { contract: Contract }

    if (!contract) {
      return NextResponse.json({ error: 'No contract provided' }, { status: 400 })
    }

    let profileSummary = 'No company profile provided.'
    if (session?.user?.id) {
      const dbProfile = await prisma.companyProfile.findUnique({
        where: { userId: session.user.id },
        select: {
          companyName: true,
          naicsCodes: true,
          businessTypes: true,
          certifications: true,
          geoPrefs: true,
          contractSizePrefs: true,
          contractTypePrefs: true,
          orgSize: true,
          capabilityStatement: true,
        },
      })
      if (dbProfile) {
        profileSummary = [
          dbProfile.companyName ? `Company: ${dbProfile.companyName}` : null,
          dbProfile.orgSize ? `Size: ${dbProfile.orgSize}` : null,
          `NAICS codes: ${JSON.parse(dbProfile.naicsCodes).join(', ') || 'none'}`,
          `Business types: ${JSON.parse(dbProfile.businessTypes).join(', ') || 'none'}`,
          `Certifications: ${JSON.parse(dbProfile.certifications).join(', ') || 'none'}`,
          `Geo preferences: ${JSON.parse(dbProfile.geoPrefs).join(', ') || 'any'}`,
          `Contract size prefs: ${JSON.parse(dbProfile.contractSizePrefs).join(', ') || 'any'}`,
          dbProfile.capabilityStatement ? `Capabilities: ${dbProfile.capabilityStatement.slice(0, 300)}` : null,
        ].filter(Boolean).join('\n')
      }
    }

    const contractText = `
Title: ${contract.title}
Agency: ${contract.agency}${contract.subAgency ? ` / ${contract.subAgency}` : ''}
Type: ${contract.typeDescription || contract.type}
Set-Aside: ${contract.setAsideDescription || 'None (open competition)'}
NAICS: ${contract.naicsCode} — ${contract.naicsDescription}
Value: ${contract.value ? `$${contract.value.toLocaleString()}` : 'TBD'}
Deadline: ${contract.responseDeadline ? new Date(contract.responseDeadline).toLocaleDateString() : 'TBD'}
Location: ${contract.placeOfPerformance || 'TBD'}
Description: ${contract.description?.slice(0, 1500) || 'Not provided'}
`.trim()

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a senior government contracting strategist. Analyze this opportunity for the company and return ONLY valid JSON — no markdown fences, no explanation.

Company Profile:
${profileSummary}

Opportunity:
${contractText}

Return JSON matching this exact shape:
{
  "fitSummary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "risks": ["<risk 1>", "<risk 2>"],
  "competitionNotes": "<1-2 sentences on likely competition and market>",
  "nextSteps": ["<action 1>", "<action 2>", "<action 3>"],
  "winProbability": <integer 0-100>
}`,
        },
      ],
    })

    const finalMsg = await stream.finalMessage()
    const raw = finalMsg.content[0].type === 'text' ? finalMsg.content[0].text.trim() : ''

    let analysis: AIDetailAnalysis | null = null
    try {
      analysis = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (match) {
        try { analysis = JSON.parse(match[0]) } catch { analysis = null }
      }
    }

    if (!analysis) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    return NextResponse.json({ analysis })
  } catch (err) {
    console.error('AI detail analyze error:', err)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
