import crypto from 'crypto'

// Signed one-click unsubscribe links (CAN-SPAM). The token is an HMAC of the
// user id + email type, keyed on NEXTAUTH_SECRET — no DB token table needed,
// and a link can't be forged for another user without the server secret.

export type EmailKind = 'digest' | 'deadlines' | 'radar' | 'all'

function secret(): string {
  return process.env.NEXTAUTH_SECRET ?? 'ir-unsub-fallback'
}

export function unsubToken(userId: string, kind: EmailKind): string {
  return crypto.createHmac('sha256', secret()).update(`${userId}:${kind}`).digest('hex').slice(0, 32)
}

export function verifyUnsubToken(userId: string, kind: EmailKind, token: string): boolean {
  const expected = unsubToken(userId, kind)
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token))
  } catch {
    return false
  }
}

export function unsubUrl(baseUrl: string, userId: string, kind: EmailKind): string {
  return `${baseUrl}/api/email/unsubscribe?u=${encodeURIComponent(userId)}&k=${kind}&t=${unsubToken(userId, kind)}`
}

// Standard footer for all notification emails
export function unsubFooterHtml(baseUrl: string, userId: string, kind: EmailKind): string {
  return `<p style="color:rgba(255,255,255,0.18);font-size:9px;margin:10px 0 0;font-family:monospace;">
    <a href="${unsubUrl(baseUrl, userId, kind)}" style="color:rgba(255,255,255,0.3);">Unsubscribe from these emails</a> ·
    <a href="${unsubUrl(baseUrl, userId, 'all')}" style="color:rgba(255,255,255,0.3);">Unsubscribe from all notifications</a>
  </p>`
}
