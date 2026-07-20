import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAdmin } from '@/lib/admin'

export const maxDuration = 60

// One tiny real request to Claude, admin-triggered — proves the
// ANTHROPIC_API_KEY in this deployment actually works before we build the
// proposal engine on top of it. Costs a fraction of a cent per press.
export async function POST() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      ok: false,
      error: 'ANTHROPIC_API_KEY is not set in this deployment. Add it in Vercel → Settings → Environment Variables, then redeploy.',
    })
  }

  const client = new Anthropic()
  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content:
            'Reply with exactly one short sentence confirming you are reachable from the IR platform. No preamble.',
        },
      ],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join(' ')
      .trim()

    return NextResponse.json({
      ok: true,
      model: response.model,
      reply: text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    })
  } catch (err) {
    // Typed errors → plain-English diagnosis the founder can act on
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({
        ok: false,
        error: 'The key was rejected (invalid or revoked). Double-check the value in Vercel — it should start with sk-ant- — and redeploy after fixing.',
      })
    }
    if (err instanceof Anthropic.PermissionDeniedError) {
      return NextResponse.json({
        ok: false,
        error: 'The key is valid but lacks permission (billing not set up, or no credits on the Anthropic account). Check console.anthropic.com → Billing.',
      })
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({
        ok: false,
        error: 'Rate limited — the key works, but too many requests right now. Try again in a minute.',
      })
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({
        ok: false,
        error: `Claude API error ${err.status}: ${err.message}`,
      })
    }
    return NextResponse.json({
      ok: false,
      error: `Network/unknown error: ${err instanceof Error ? err.message : String(err)}`,
    })
  }
}
