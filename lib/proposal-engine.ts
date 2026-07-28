import {
  generateFullProposal,
  type CompanyData,
  type FullProposalQuestionnaire,
} from './documents'

// ─── The proposal engine ──────────────────────────────────────────────────────
// One entry point for drafting a full proposal, with two interchangeable
// backends:
//
//   • TEMPLATE (live today, zero cost) — deterministic assembly of the user's
//     questionnaire answers into a formatted 4-volume federal proposal.
//   • AI (activates the moment ANTHROPIC_API_KEY + credits exist) — Claude
//     rewrites each volume into polished narrative prose from the same answers.
//
// The whole point of this file: the generate route calls draftProposal() and
// never knows or cares which backend ran. Turning on AI is flipping one env
// var and funding the account — no rewrite, no new code path in the caller.

export type DraftMode = 'ai' | 'template'

export interface DraftResult {
  content: string
  mode: DraftMode
}

// Is the AI backend even a possibility in this deployment? (Key present.)
// Actual per-request spend is gated separately by the daily budget.
export function isAiDraftingConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

// Draft a full proposal. Always returns usable content: AI when configured,
// funded, and successful; template in every other case. Never throws for an
// AI-side problem — a drafting feature must not fail because credits ran out.
export async function draftProposal(
  company: CompanyData,
  questionnaire: FullProposalQuestionnaire
): Promise<DraftResult> {
  const template = generateFullProposal(company, questionnaire)

  if (!isAiDraftingConfigured()) {
    return { content: template, mode: 'template' }
  }

  // Reserve daily AI budget — fails closed (real money). If spent, template.
  const { tryConsumeAiDraft, releaseAiDraft } = await import('./ai-budget')
  if (!(await tryConsumeAiDraft())) {
    return { content: template, mode: 'template' }
  }

  try {
    const ai = await enhanceWithClaude(company, questionnaire, template)
    return { content: ai, mode: 'ai' }
  } catch (err) {
    console.error('AI drafting failed, falling back to template:', err)
    await releaseAiDraft() // give the budget slot back — nothing was produced
    return { content: template, mode: 'template' }
  }
}

// ─── Claude backend ───────────────────────────────────────────────────────────
// Sends the template draft to Claude as a strong scaffold and asks it to
// elevate each volume into evaluator-ready narrative while preserving every
// fact, number, and section the user supplied. Kept isolated so the template
// path has zero dependency on the SDK.
async function enhanceWithClaude(
  company: CompanyData,
  questionnaire: FullProposalQuestionnaire,
  templateDraft: string
): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic()

  const system = [
    'You are a senior federal proposal writer for a small business bidding on a U.S. government contract.',
    'You will be given a complete, structurally-correct 4-volume proposal as an HTML fragment assembled from the bidder\'s own answers.',
    'Rewrite it into polished, compliant, evaluator-ready prose. Rules:',
    '- Preserve every fact, name, date, dollar figure, phase, risk, and past-performance reference exactly. Never invent details.',
    '- Keep the four-volume structure and all section headings.',
    '- Improve clarity, persuasiveness, and compliance language; remove filler and repetition.',
    '- Return a valid HTML fragment using only these tags: <h1> <h2> <h3> <p> <ul> <ol> <li> <strong> <em> <hr> <br>. No <html>, <head>, <body>, <style>, tables, or inline styles.',
    '- Do not add a cover letter, commentary, notes, or Markdown code fences — return only the finished proposal HTML.',
  ].join('\n')

  const user = [
    `COMPANY: ${company.companyName} (${company.businessTypes.join(', ') || 'Small Business'})`,
    `CONTRACT: ${questionnaire.contractTitle} — ${questionnaire.agencyName}`,
    '',
    'Here is the assembled draft to elevate:',
    '',
    templateDraft,
  ].join('\n')

  // Streaming: a full 4-volume rewrite can exceed non-streaming HTTP timeouts.
  const stream = client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 32000,
    system,
    messages: [{ role: 'user', content: user }],
  })
  const message = await stream.finalMessage()

  const text = message.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('\n')
    .trim()

  if (!text) throw new Error('Claude returned empty content')
  return text
}
