// Simple sliding-window rate limiter.
// Per-process Map — works within a single serverless instance.
// Upgrade to @upstash/ratelimit + Redis for multi-instance scale.
const store = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const rec = store.get(key)

  if (!rec || now > rec.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }

  if (rec.count >= limit) {
    return { allowed: false, remaining: 0 }
  }

  rec.count++
  return { allowed: true, remaining: limit - rec.count }
}

export function ipKey(req: Request, prefix: string): string {
  const forwarded = (req as { headers: Headers }).headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() ?? '127.0.0.1'
  return `${prefix}:${ip}`
}
