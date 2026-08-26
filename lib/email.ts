// Email sending via Resend (https://resend.com).
// Set RESEND_API_KEY in environment variables.
// Free tier: 3,000 emails/month, 100/day.
// From address must be from a verified domain in your Resend account.

import { prisma } from './prisma'
import { unsubFooterHtml } from './unsub'

const FROM = 'IR <noreply@ir-gov.app>'
const RESEND_API = 'https://api.resend.com/emails'

// External strings (SAM.gov titles, USAspending incumbent names, user names,
// upstream error bodies) go through this before landing in email HTML.
function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtDateSafe(d: string): string {
  const date = new Date(d)
  if (!d || isNaN(date.getTime())) return 'Not posted'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Best-effort audit trail — must never break the actual send.
async function logEmail(to: string, subject: string, status: string, error?: string) {
  try {
    await prisma.emailLog.create({ data: { to, subject, status, error: error?.slice(0, 1000) } })
  } catch (logErr) {
    console.error('[email] Failed to write EmailLog:', logErr)
  }
}

// Resend free tier: 100 emails/day shared by EVERYTHING. Without a budget,
// a big digest morning eats the quota and then a new signup's VERIFICATION
// email silently fails — the worst possible casualty. So: bulk sends
// (digest/radar/reminders) reserve from a Kv-tracked daily budget and stop
// at a floor that stays reserved for transactional email; transactional
// sends are counted but never blocked.
const TRANSACTIONAL_RESERVE = 20

function emailBudget(): number {
  const fromEnv = parseInt(process.env.RESEND_DAILY_BUDGET ?? '', 10)
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 100
}

async function tryConsumeEmailBudget(bulk: boolean): Promise<boolean> {
  const key = `email-quota:${new Date().toISOString().slice(0, 10)}`
  const ceiling = bulk ? emailBudget() - TRANSACTIONAL_RESERVE : Number.MAX_SAFE_INTEGER
  try {
    await prisma.$executeRaw`INSERT INTO "Kv" ("key", "value", "updatedAt") VALUES (${key}, '0', CURRENT_TIMESTAMP) ON CONFLICT ("key") DO NOTHING`
    const claimed = await prisma.$executeRaw`UPDATE "Kv" SET "value" = CAST(CAST("value" AS INTEGER) + 1 AS TEXT), "updatedAt" = CURRENT_TIMESTAMP WHERE "key" = ${key} AND CAST("value" AS INTEGER) + 1 <= ${ceiling}`
    return claimed > 0
  } catch {
    return true // Kv missing pre-migration — don't block email
  }
}

async function send(to: string, subject: string, html: string, replyTo?: string, opts?: { bulk?: boolean }): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    // No key configured — record it so the admin dashboard makes this visible
    console.log(`[email] SKIPPED (no RESEND_API_KEY) To: ${to} | Subject: ${subject}`)
    await logEmail(to, subject, 'skipped_no_key', 'RESEND_API_KEY is not set in this environment')
    return
  }

  if (!(await tryConsumeEmailBudget(opts?.bulk ?? false))) {
    // Bulk budget spent — skip so verification/reset emails keep working
    await logEmail(to, subject, 'skipped_quota', 'Daily bulk-email budget spent — reserved remainder for transactional email')
    return
  }

  // Replies should reach a person, not noreply@. Explicit replyTo (e.g. the
  // proposal sender) always wins; otherwise fall back to EMAIL_REPLY_TO
  // (the founder's mailbox) once that env var is set.
  const effectiveReplyTo = replyTo ?? process.env.EMAIL_REPLY_TO

  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html, ...(effectiveReplyTo ? { reply_to: [effectiveReplyTo] } : {}) }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Resend API error ${res.status}: ${body}`)
    }

    await logEmail(to, subject, 'sent')
  } catch (err) {
    await logEmail(to, subject, 'failed', err instanceof Error ? err.message : String(err))
    throw err
  }
}

export async function sendVerificationEmail(
  email: string,
  token: string,
  baseUrl: string
): Promise<void> {
  const link = `${baseUrl}/api/auth/verify-email?token=${token}`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111111;border:1px solid rgba(255,255,255,0.08);">
        <tr>
          <td style="padding:36px 48px 28px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="color:#C41230;font-size:20px;font-weight:700;">ᛁ</span>
            <span style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.12em;margin-left:8px;">IR</span>
            <span style="color:rgba(255,255,255,0.25);font-size:10px;letter-spacing:0.1em;margin-left:6px;">GOVCON INTELLIGENCE</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 48px;">
            <p style="color:rgba(255,255,255,0.4);font-size:9px;letter-spacing:0.18em;margin:0 0 20px;">ACCOUNT VERIFICATION</p>
            <h1 style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.02em;margin:0 0 16px;font-family:sans-serif;">Verify your email address.</h1>
            <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.7;margin:0 0 32px;font-family:sans-serif;">
              Click the button below to verify your email and activate your IR account.
              This link expires in 24 hours.
            </p>
            <a href="${link}"
               style="display:inline-block;padding:14px 32px;background:#C41230;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.1em;text-decoration:none;">
              VERIFY EMAIL →
            </a>
            <p style="color:rgba(255,255,255,0.2);font-size:11px;line-height:1.6;margin:32px 0 0;font-family:sans-serif;">
              If you didn't create an IR account, ignore this email.<br>
              Or paste this link: <a href="${link}" style="color:#C41230;">${link}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  await send(email, 'Verify your IR account', html)
}

// Sent once, right after a new user verifies their email — the moment their
// account goes live. Orients them to the three first moves that lead to value
// (profile → matches → proposal) so a new signup never lands in silence.
export async function sendWelcomeEmail(
  email: string,
  name: string | null,
  baseUrl: string
): Promise<void> {
  const greeting = name ? `Welcome, ${esc(name.split(' ')[0])}.` : 'Welcome to IR.'
  const steps = [
    ['01', 'Finish your profile', 'Add your UEI, NAICS codes, and set-aside status. This is what IR scores every contract against — the more complete it is, the sharper your matches.'],
    ['02', 'See your matches', 'Open your dashboard to the opportunities already scored against your business, newest first, with the reasoning shown for each one.'],
    ['03', 'Draft your first proposal', 'Found one worth bidding? Answer a short questionnaire and IR turns it into a formatted federal proposal you can refine and send.'],
  ]

  const stepRows = steps.map(([n, title, body]) => `
    <tr><td style="padding:0 0 20px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="40" valign="top" style="color:#C41230;font-size:12px;font-weight:700;font-family:monospace;letter-spacing:0.08em;">${n}</td>
        <td valign="top">
          <p style="color:#ffffff;font-size:15px;font-weight:700;margin:0 0 4px;font-family:sans-serif;">${title}</p>
          <p style="color:rgba(255,255,255,0.45);font-size:13px;line-height:1.65;margin:0;font-family:sans-serif;">${body}</p>
        </td>
      </tr></table>
    </td></tr>`).join('')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111111;border:1px solid rgba(255,255,255,0.08);">
        <tr>
          <td style="padding:36px 48px 28px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="color:#C41230;font-size:20px;font-weight:700;">ᛁ</span>
            <span style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.12em;margin-left:8px;">IR</span>
            <span style="color:rgba(255,255,255,0.25);font-size:10px;letter-spacing:0.1em;margin-left:6px;">GOVCON INTELLIGENCE</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 48px 12px;">
            <p style="color:rgba(255,255,255,0.4);font-size:9px;letter-spacing:0.18em;margin:0 0 20px;">YOUR ACCOUNT IS LIVE</p>
            <h1 style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.02em;margin:0 0 16px;font-family:sans-serif;">${greeting}</h1>
            <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.7;margin:0 0 32px;font-family:sans-serif;">
              You're in. IR watches the entire federal market — every SAM.gov solicitation — and scores
              it against your business, so you spend your time bidding, not searching. Here are the three
              moves that get you to your first match.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">${stepRows}</table>
            <a href="${baseUrl}/dashboard"
               style="display:inline-block;padding:14px 32px;background:#C41230;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.1em;text-decoration:none;margin-top:12px;">
              GO TO YOUR DASHBOARD →
            </a>
            <p style="color:rgba(255,255,255,0.2);font-size:11px;line-height:1.6;margin:32px 0 0;font-family:sans-serif;">
              Questions? Just reply to this email — it reaches a real person.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  await send(email, 'Welcome to IR — your account is live', html)
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  baseUrl: string
): Promise<void> {
  const link = `${baseUrl}/reset-password?token=${token}`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111111;border:1px solid rgba(255,255,255,0.08);">
        <tr>
          <td style="padding:36px 48px 28px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="color:#C41230;font-size:20px;font-weight:700;">ᛁ</span>
            <span style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.12em;margin-left:8px;">IR</span>
            <span style="color:rgba(255,255,255,0.25);font-size:10px;letter-spacing:0.1em;margin-left:6px;">GOVCON INTELLIGENCE</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 48px;">
            <p style="color:rgba(255,255,255,0.4);font-size:9px;letter-spacing:0.18em;margin:0 0 20px;">PASSWORD RESET</p>
            <h1 style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.02em;margin:0 0 16px;font-family:sans-serif;">Reset your password.</h1>
            <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.7;margin:0 0 32px;font-family:sans-serif;">
              We received a request to reset the password for this account.
              Click below to choose a new password. This link expires in 1 hour.
            </p>
            <a href="${link}"
               style="display:inline-block;padding:14px 32px;background:#C41230;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.1em;text-decoration:none;">
              RESET PASSWORD →
            </a>
            <p style="color:rgba(255,255,255,0.2);font-size:11px;line-height:1.6;margin:32px 0 0;font-family:sans-serif;">
              If you didn't request a password reset, ignore this email — your password won't change.<br>
              Or paste this link: <a href="${link}" style="color:#C41230;">${link}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  await send(email, 'Reset your IR password', html)
}

export async function sendProposalEmail(
  to: string,
  senderName: string,
  proposalTitle: string,
  contractTitle: string,
  agencyName: string,
  content: string,
  viewUrl: string
): Promise<void> {
  // Content is an HTML fragment — strip tags for a clean text preview snippet.
  const previewLines = esc(
    content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 360)
  )

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111111;border:1px solid rgba(255,255,255,0.08);">
        <tr>
          <td style="padding:32px 48px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="color:#C41230;font-size:20px;font-weight:700;">ᛁ</span>
            <span style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.12em;margin-left:8px;">IR</span>
            <span style="color:rgba(255,255,255,0.25);font-size:10px;letter-spacing:0.1em;margin-left:6px;">GOVCON INTELLIGENCE</span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 48px 28px;">
            <p style="color:rgba(255,255,255,0.35);font-size:9px;letter-spacing:0.18em;margin:0 0 16px;">PROPOSAL SHARED WITH YOUR TEAM</p>
            <h1 style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.02em;margin:0 0 8px;font-family:sans-serif;">${esc(contractTitle)}</h1>
            <p style="color:rgba(255,255,255,0.4);font-size:13px;margin:0 0 28px;font-family:sans-serif;">${esc(agencyName)}</p>
            <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.7;margin:0 0 28px;font-family:sans-serif;">
              <strong style="color:#ffffff;">${esc(senderName)}</strong> has generated a proposal for this opportunity
              and shared it with your organization on IR.
            </p>
            <a href="${viewUrl}"
               style="display:inline-block;padding:13px 28px;background:#C41230;color:#ffffff;font-size:10px;font-weight:700;letter-spacing:0.1em;text-decoration:none;margin-bottom:32px;">
              VIEW PROPOSAL IN IR →
            </a>
            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);padding:20px;margin-bottom:8px;">
              <p style="color:rgba(255,255,255,0.2);font-size:9px;letter-spacing:0.14em;margin:0 0 12px;">PROPOSAL PREVIEW</p>
              <pre style="color:rgba(255,255,255,0.45);font-size:10px;line-height:1.7;margin:0;white-space:pre-wrap;overflow:hidden;">${previewLines}</pre>
              <p style="color:rgba(255,255,255,0.2);font-size:10px;margin:12px 0 0;">... full proposal available in IR</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 48px;border-top:1px solid rgba(255,255,255,0.06);">
            <p style="color:rgba(255,255,255,0.2);font-size:10px;margin:0;line-height:1.6;">
              You received this because you are a member of an IR organization.<br>
              <a href="${viewUrl}" style="color:#C41230;">ir-gov.app</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  await send(to, `[IR Proposal] ${contractTitle} — ${agencyName}`, html)
}

export interface DigestMatch {
  title: string
  agency: string
  valueFormatted: string
  setAsideDescription: string
  responseDeadline: string
  matchScore: number
  link: string
  // True when this hit came from the user's watchlist keywords rather than
  // (or in addition to) profile scoring — rendered with a WATCHLIST tag.
  watchlist?: boolean
}

export async function sendDailyDigestEmail(
  email: string,
  name: string | null,
  matches: DigestMatch[],
  baseUrl: string,
  userId?: string,
  // One-sentence market stat computed from IR's own store — the line that
  // makes the digest worth forwarding. Omitted cleanly when unavailable.
  pulse?: string
): Promise<void> {
  const rows = matches
    .map(
      m => `
        <tr>
          <td style="padding:16px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <a href="${esc(m.link)}" style="color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;font-family:sans-serif;">${esc(m.title)}</a>
                  <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:6px 0 0;font-family:sans-serif;">
                    ${esc(m.agency)} · ${esc(m.valueFormatted)} · ${esc(m.setAsideDescription)}
                  </p>
                  <p style="color:rgba(255,255,255,0.3);font-size:10px;margin:4px 0 0;font-family:sans-serif;">
                    Deadline: ${fmtDateSafe(m.responseDeadline)}
                  </p>
                </td>
                <td align="right" valign="top" style="white-space:nowrap;padding-left:16px;">
                  ${m.watchlist ? '<div style="color:#b45309;font-size:8px;letter-spacing:0.12em;font-weight:700;margin-bottom:4px;">◉ WATCHLIST</div>' : ''}
                  <span style="color:#C41230;font-size:16px;font-weight:700;">${m.matchScore}</span>
                  <span style="color:rgba(255,255,255,0.25);font-size:9px;letter-spacing:0.1em;"> MATCH</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
    )
    .join('')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111111;border:1px solid rgba(255,255,255,0.08);">
        <tr>
          <td style="padding:32px 48px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="color:#C41230;font-size:20px;font-weight:700;">ᛁ</span>
            <span style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.12em;margin-left:8px;">IR</span>
            <span style="color:rgba(255,255,255,0.25);font-size:10px;letter-spacing:0.1em;margin-left:6px;">GOVCON INTELLIGENCE</span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 48px;">
            <p style="color:rgba(255,255,255,0.4);font-size:9px;letter-spacing:0.18em;margin:0 0 16px;">DAILY MATCH REPORT</p>
            <h1 style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.02em;margin:0 0 8px;font-family:sans-serif;">${matches.length} new ${matches.length === 1 ? 'opportunity matches' : 'opportunities match'} your profile.</h1>
            <p style="color:rgba(255,255,255,0.4);font-size:13px;margin:0 0 24px;font-family:sans-serif;">${name ? `${esc(name)}, these` : 'These'} were posted in the last 24 hours and scored against your company profile.</p>
            ${pulse ? `<div style="background:rgba(196,18,48,0.06);border:1px solid rgba(196,18,48,0.25);padding:14px 18px;margin:0 0 24px;">
              <p style="color:rgba(255,255,255,0.3);font-size:8px;letter-spacing:0.16em;margin:0 0 6px;">◆ MARKET PULSE</p>
              <p style="color:rgba(255,255,255,0.65);font-size:13px;line-height:1.6;margin:0;font-family:sans-serif;">${esc(pulse)}</p>
            </div>` : ''}
            <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
            <a href="${baseUrl}/dashboard"
               style="display:inline-block;margin-top:28px;padding:13px 28px;background:#C41230;color:#ffffff;font-size:10px;font-weight:700;letter-spacing:0.1em;text-decoration:none;">
              VIEW ALL MATCHES →
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 48px;border-top:1px solid rgba(255,255,255,0.06);">
            <p style="color:rgba(255,255,255,0.2);font-size:10px;margin:0;line-height:1.6;">
              You receive this because you have an active IR company profile.<br>
              Manage notifications in <a href="${baseUrl}/settings" style="color:#C41230;">settings</a>.
            </p>
            ${userId ? unsubFooterHtml(baseUrl, userId, 'digest') : ''}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  await send(email, `[IR] ${matches.length} new contract ${matches.length === 1 ? 'match' : 'matches'} for your profile`, html, undefined, { bulk: true })
}

export interface WeeklyReportStats {
  activeCount: number
  activeValue: number
  wonValue: number
  deadlines: { title: string; agency: string; days: number }[]
  newThisWeek: number
}

// Monday pipeline summary — a "here's where your bids stand" nudge that keeps
// engaged users coming back. Gated on the digest preference; only sent to users
// with an active pipeline (nothing to summarize otherwise).
export async function sendWeeklyReportEmail(
  email: string,
  name: string | null,
  stats: WeeklyReportStats,
  baseUrl: string,
  userId?: string
): Promise<void> {
  const usd = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `$${Math.round(n / 1_000)}K` : `$${n.toLocaleString()}`

  const tile = (label: string, value: string) => `
    <td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);padding:20px 22px;">
      <div style="color:rgba(255,255,255,0.35);font-size:9px;letter-spacing:0.14em;font-family:monospace;margin-bottom:8px;">${label}</div>
      <div style="color:#ffffff;font-size:24px;font-weight:800;font-family:sans-serif;letter-spacing:-0.02em;">${value}</div>
    </td>`

  const deadlineRows = stats.deadlines.length
    ? stats.deadlines.map(d => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
            <div style="color:#ffffff;font-size:13px;font-weight:600;font-family:sans-serif;">${esc(d.title)}</div>
            <div style="color:rgba(255,255,255,0.4);font-size:11px;font-family:sans-serif;margin-top:3px;">${esc(d.agency)}</div>
          </td>
          <td align="right" valign="top" style="white-space:nowrap;padding-left:16px;">
            <span style="color:${d.days <= 3 ? '#C41230' : '#b45309'};font-size:12px;font-weight:700;font-family:monospace;">${d.days <= 0 ? 'DUE' : `${d.days}D LEFT`}</span>
          </td>
        </tr>`).join('')
    : `<tr><td style="color:rgba(255,255,255,0.35);font-size:12px;font-family:sans-serif;padding:12px 0;">No deadlines in the next two weeks — a good week to add new pursuits.</td></tr>`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111111;border:1px solid rgba(255,255,255,0.08);">
        <tr>
          <td style="padding:32px 48px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="color:#C41230;font-size:20px;font-weight:700;">ᛁ</span>
            <span style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.12em;margin-left:8px;">IR</span>
            <span style="color:rgba(255,255,255,0.25);font-size:10px;letter-spacing:0.1em;margin-left:6px;">WEEKLY PIPELINE REPORT</span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 48px 8px;">
            <h1 style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.02em;margin:0 0 8px;font-family:sans-serif;">${name ? `${esc(name)}, your` : 'Your'} week in review.</h1>
            <p style="color:rgba(255,255,255,0.4);font-size:13px;margin:0 0 24px;font-family:sans-serif;">Where your bids stand, and what's closing soon.</p>
            <table width="100%" cellpadding="0" cellspacing="6" style="margin:0 0 8px;"><tr>
              ${tile('ACTIVE BIDS', String(stats.activeCount))}
              ${tile('ACTIVE VALUE', usd(stats.activeValue))}
              ${tile('WON TO DATE', usd(stats.wonValue))}
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 48px 8px;">
            <p style="color:rgba(255,255,255,0.3);font-size:9px;letter-spacing:0.14em;font-family:monospace;margin:0 0 4px;">CLOSING SOON</p>
            <table width="100%" cellpadding="0" cellspacing="0">${deadlineRows}</table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 48px 32px;">
            <p style="color:rgba(255,255,255,0.4);font-size:12px;font-family:sans-serif;margin:0 0 20px;line-height:1.6;">
              ${stats.newThisWeek} new ${stats.newThisWeek === 1 ? 'opportunity was' : 'opportunities were'} posted to the federal market this week — matched against your profile and waiting on your dashboard.
            </p>
            <a href="${baseUrl}/saved" style="display:inline-block;padding:13px 28px;background:#C41230;color:#ffffff;font-size:10px;font-weight:700;letter-spacing:0.1em;text-decoration:none;">
              OPEN YOUR PIPELINE →
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 48px;border-top:1px solid rgba(255,255,255,0.06);">
            <p style="color:rgba(255,255,255,0.2);font-size:10px;margin:0;line-height:1.6;">
              You receive this because you have an active IR company profile.<br>
              Manage notifications in <a href="${baseUrl}/settings" style="color:#C41230;">settings</a>.
            </p>
            ${userId ? unsubFooterHtml(baseUrl, userId, 'digest') : ''}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  await send(email, `[IR] Your weekly pipeline report`, html, undefined, { bulk: true })
}

export async function sendDeadlineReminderEmail(
  email: string,
  name: string | null,
  contractTitle: string,
  agency: string,
  deadline: Date,
  daysLeft: number,
  baseUrl: string,
  userId?: string
): Promise<void> {
  const urgency = daysLeft <= 1 ? 'DUE IN 24 HOURS' : `${daysLeft} DAYS REMAINING`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111111;border:1px solid rgba(255,255,255,0.08);">
        <tr>
          <td style="padding:32px 48px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="color:#C41230;font-size:20px;font-weight:700;">ᛁ</span>
            <span style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.12em;margin-left:8px;">IR</span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 48px;">
            <p style="color:#C41230;font-size:9px;letter-spacing:0.18em;margin:0 0 16px;font-weight:700;">⏱ ${urgency}</p>
            <h1 style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.02em;margin:0 0 8px;font-family:sans-serif;">${esc(contractTitle)}</h1>
            <p style="color:rgba(255,255,255,0.4);font-size:13px;margin:0 0 24px;font-family:sans-serif;">${esc(agency)}</p>
            <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.7;margin:0 0 28px;font-family:sans-serif;">
              ${name ? `${esc(name)}, a` : 'A'} contract you saved has a response deadline of
              <strong style="color:#ffffff;">${deadline.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</strong>.
              If you're bidding, your proposal needs to be submitted before then.
            </p>
            <a href="${baseUrl}/saved"
               style="display:inline-block;padding:13px 28px;background:#C41230;color:#ffffff;font-size:10px;font-weight:700;letter-spacing:0.1em;text-decoration:none;">
              OPEN SAVED CONTRACTS →
            </a>
            ${userId ? unsubFooterHtml(baseUrl, userId, 'deadlines') : ''}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  await send(email, `[IR] Deadline ${daysLeft <= 1 ? 'tomorrow' : `in ${daysLeft} days`}: ${contractTitle}`, html, undefined, { bulk: true })
}

export interface RecompeteAlertItem {
  description: string
  incumbent: string
  amount: number | null
  endDate: string
  monthsUntilExpiry: number
  agency: string
}

export async function sendRecompeteAlertEmail(
  email: string,
  name: string | null,
  items: RecompeteAlertItem[],
  baseUrl: string,
  userId?: string
): Promise<void> {
  const fmtAmt = (v: number | null) =>
    !v ? 'Undisclosed' : v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${Math.round(v / 1000)}K`

  const rows = items
    .map(
      r => `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
            <div style="color:#ffffff;font-size:13px;font-weight:700;font-family:sans-serif;line-height:1.5;">${esc(r.description.slice(0, 120))}</div>
            <div style="color:rgba(255,255,255,0.4);font-size:11px;margin-top:5px;font-family:sans-serif;">
              ${esc(r.agency)} · Incumbent: <span style="color:rgba(255,255,255,0.7);">${esc(r.incumbent)}</span> · ${fmtAmt(r.amount)}
            </div>
            <div style="color:#C41230;font-size:10px;letter-spacing:0.08em;margin-top:4px;font-family:monospace;font-weight:700;">
              EXPIRES ${fmtDateSafe(r.endDate).toUpperCase()} · ~${r.monthsUntilExpiry} MONTHS
            </div>
          </td>
        </tr>`
    )
    .join('')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111111;border:1px solid rgba(255,255,255,0.08);">
        <tr>
          <td style="padding:32px 48px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="color:#C41230;font-size:20px;font-weight:700;">ᛁ</span>
            <span style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.12em;margin-left:8px;">IR</span>
            <span style="color:rgba(255,255,255,0.25);font-size:10px;letter-spacing:0.1em;margin-left:6px;">RECOMPETE RADAR</span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 48px;">
            <p style="color:#C41230;font-size:9px;letter-spacing:0.18em;margin:0 0 16px;font-weight:700;">◎ NEW ON YOUR RADAR</p>
            <h1 style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.02em;margin:0 0 8px;font-family:sans-serif;">${items.length} contract${items.length === 1 ? '' : 's'} in your space ${items.length === 1 ? 'is' : 'are'} expiring.</h1>
            <p style="color:rgba(255,255,255,0.4);font-size:13px;margin:0 0 24px;font-family:sans-serif;line-height:1.7;">
              ${name ? `${esc(name)}, these` : 'These'} awards match your NAICS codes and end within 18 months —
              the recompete solicitations are coming before SAM.gov shows anything. Time to position.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
            <a href="${baseUrl}/recompetes"
               style="display:inline-block;margin-top:28px;padding:13px 28px;background:#C41230;color:#ffffff;font-size:10px;font-weight:700;letter-spacing:0.1em;text-decoration:none;">
              OPEN RECOMPETE RADAR →
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 48px;border-top:1px solid rgba(255,255,255,0.06);">
            <p style="color:rgba(255,255,255,0.2);font-size:10px;margin:0;line-height:1.6;">
              You're alerted once per new expiring award. Source: USAspending.gov award data.
            </p>
            ${userId ? unsubFooterHtml(baseUrl, userId, 'radar') : ''}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  await send(email, `[IR Radar] ${items.length} expiring contract${items.length === 1 ? '' : 's'} in your NAICS codes`, html, undefined, { bulk: true })
}

// Monday founder brief — goes to the admin only. Deliberately not gated on
// notifyDigest: this is the accountability loop for outreach, not a product
// notification, and it's transactional (never counts against the bulk budget).
export async function sendFounderBriefEmail(
  adminEmail: string,
  brief: {
    users: number; signupsWeek: number; founding: number; referred: number
    liveCount: number; postedThisWeek: number
  },
  talkingPoints: string[],
  packUrl: string,
  baseUrl: string,
  // This week's strongest generated draft, so the email carries something
  // publishable rather than only a reminder to go look.
  draft?: { label: string; body: string } | null
): Promise<void> {
  const tile = (label: string, value: string, accent?: boolean) => `
    <td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);padding:18px 20px;">
      <div style="color:rgba(255,255,255,0.35);font-size:9px;letter-spacing:0.14em;font-family:monospace;margin-bottom:8px;">${label}</div>
      <div style="color:${accent ? '#C41230' : '#ffffff'};font-size:26px;font-weight:800;font-family:sans-serif;letter-spacing:-0.02em;">${value}</div>
    </td>`

  const points = talkingPoints.length
    ? talkingPoints.map(p => `
        <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="color:#C41230;font-weight:700;margin-right:10px;">◆</span>
          <span style="color:rgba(255,255,255,0.7);font-size:13px;line-height:1.6;font-family:sans-serif;">${esc(p)}</span>
        </td></tr>`).join('')
    : `<tr><td style="color:rgba(255,255,255,0.35);font-size:12px;font-family:sans-serif;padding:10px 0;">No fresh postings this week — the sync may not have run. Worth a look at the admin board.</td></tr>`

  const movement = brief.signupsWeek > 0
    ? `<span style="color:#C41230;font-weight:700;">${brief.signupsWeek} new signup${brief.signupsWeek === 1 ? '' : 's'}</span> this week.`
    : `No signups this week. Two comments a day is the whole job — the number moves when you talk to people.`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111111;border:1px solid rgba(255,255,255,0.08);">
        <tr>
          <td style="padding:32px 44px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="color:#C41230;font-size:20px;font-weight:700;">ᛁ</span>
            <span style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.12em;margin-left:8px;">IR</span>
            <span style="color:rgba(255,255,255,0.25);font-size:10px;letter-spacing:0.1em;margin-left:6px;">FOUNDER BRIEF</span>
          </td>
        </tr>
        <tr>
          <td style="padding:34px 44px 8px;">
            <p style="color:rgba(255,255,255,0.4);font-size:9px;letter-spacing:0.18em;margin:0 0 16px;">THIS WEEK</p>
            <h1 style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.02em;margin:0 0 10px;font-family:sans-serif;">Two comments a day.</h1>
            <p style="color:rgba(255,255,255,0.45);font-size:13.5px;line-height:1.7;margin:0 0 24px;font-family:sans-serif;">${movement}</p>
            <table width="100%" cellpadding="0" cellspacing="6" style="margin:0 0 8px;"><tr>
              ${tile('USERS', String(brief.users))}
              ${tile('FOUNDING', String(brief.founding), true)}
              ${tile('REFERRED', String(brief.referred))}
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 44px 8px;">
            <p style="color:rgba(255,255,255,0.3);font-size:9px;letter-spacing:0.14em;font-family:monospace;margin:0 0 6px;">USE THESE IN COMMENTS THIS WEEK</p>
            <p style="color:rgba(255,255,255,0.35);font-size:12px;line-height:1.6;margin:0 0 10px;font-family:sans-serif;">Live numbers from IR's own store. Nobody else in that comment section can quote these.</p>
            <table width="100%" cellpadding="0" cellspacing="0">${points}</table>
          </td>
        </tr>
        ${draft ? `<tr>
          <td style="padding:22px 44px 4px;">
            <p style="color:rgba(255,255,255,0.3);font-size:9px;letter-spacing:0.14em;font-family:monospace;margin:0 0 6px;">READY TO POST · ${esc(draft.label.toUpperCase())}</p>
            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);padding:18px 20px;">
              <pre style="margin:0;color:rgba(255,255,255,0.7);font-size:12.5px;line-height:1.75;white-space:pre-wrap;font-family:sans-serif;">${esc(draft.body)}</pre>
            </div>
            <p style="color:rgba(255,255,255,0.25);font-size:11px;margin:10px 0 0;font-family:sans-serif;">
              Built from this week's real market data. More drafts at <a href="${baseUrl}/admin/posts" style="color:#C41230;">${baseUrl}/admin/posts</a>
            </p>
          </td>
        </tr>` : ''}
        <tr>
          <td style="padding:26px 44px 34px;">
            <a href="${packUrl}" style="display:inline-block;padding:13px 28px;background:#C41230;color:#ffffff;font-size:10px;font-weight:700;letter-spacing:0.1em;text-decoration:none;">
              OPEN THE ENGAGEMENT PACK →
            </a>
            <p style="color:rgba(255,255,255,0.25);font-size:11px;line-height:1.7;margin:22px 0 0;font-family:sans-serif;">
              Targets, comment shapes, and this week's post schedule are all in the pack.<br>
              Admin board: <a href="${baseUrl}/admin" style="color:#C41230;">${baseUrl}/admin</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  await send(adminEmail, `[IR] Founder brief — ${brief.signupsWeek} signup${brief.signupsWeek === 1 ? '' : 's'} this week`, html)
}

export async function sendAdminAlertEmail(
  adminEmail: string,
  subject: string,
  problems: string[]
): Promise<void> {
  const items = problems.map(p => `<li style="color:rgba(255,255,255,0.6);font-size:13px;line-height:1.8;font-family:monospace;">${esc(p)}</li>`).join('')
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111111;border:1px solid #C41230;">
        <tr>
          <td style="padding:36px 48px;">
            <p style="color:#C41230;font-size:9px;letter-spacing:0.18em;margin:0 0 16px;font-weight:700;">⚠ SYSTEM ALERT</p>
            <h1 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 20px;font-family:sans-serif;">${subject}</h1>
            <ul style="margin:0;padding-left:20px;">${items}</ul>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  await send(adminEmail, `[IR ALERT] ${subject}`, html)
}

// Sent to a government point of contact on the user's behalf. Deliberately
// plain and formal — no dark branding — and replies go to the user, not us.
export async function sendProposalToOfficerEmail(
  to: string,
  contactName: string,
  senderName: string,
  senderEmail: string,
  companyName: string,
  contractTitle: string,
  solicitationNumber: string,
  content: string
): Promise<void> {
  // New documents are HTML fragments (render directly); legacy docs are plain
  // text (escape into a monospace block).
  const body = /^\s*</.test(content)
    ? `<div style="font-size:14px;line-height:1.7;color:#1a1a1a;">${content}</div>`
    : `<pre style="font-family:'Courier New',monospace;font-size:12px;line-height:1.6;white-space:pre-wrap;color:#1a1a1a;margin:0 0 24px;">${esc(content)}</pre>`
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,serif;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:0 24px;">
            <p style="font-size:15px;line-height:1.7;margin:0 0 16px;">Dear ${esc(contactName)},</p>
            <p style="font-size:15px;line-height:1.7;margin:0 0 16px;">
              Please find below a proposal submitted by <strong>${esc(companyName)}</strong> in response to
              <strong>${esc(contractTitle)}</strong>${solicitationNumber ? ` (Solicitation No. ${esc(solicitationNumber)})` : ''}.
            </p>
            <p style="font-size:15px;line-height:1.7;margin:0 0 24px;">
              For any questions regarding this submission, please contact ${esc(senderName)} directly at
              <a href="mailto:${encodeURIComponent(senderEmail)}" style="color:#1a1a1a;">${esc(senderEmail)}</a> or simply reply to this email.
            </p>
            <hr style="border:none;border-top:1px solid #dddddd;margin:0 0 24px;">
            ${body}
            <hr style="border:none;border-top:1px solid #dddddd;margin:0 0 16px;">
            <p style="font-size:12px;color:#888888;line-height:1.6;margin:0;">
              Sent on behalf of ${esc(companyName)} via IR (ir-gov.app). Reply-to is set to the sender.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  await send(
    to,
    `Proposal Submission — ${contractTitle}${solicitationNumber ? ` (${solicitationNumber})` : ''} — ${companyName}`,
    html,
    senderEmail
  )
}

export async function sendTeamInviteEmail(
  email: string,
  teamName: string,
  token: string,
  baseUrl: string
): Promise<void> {
  const link = `${baseUrl}/invite/${token}`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111111;border:1px solid rgba(255,255,255,0.08);">
        <tr>
          <td style="padding:36px 48px 28px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="color:#C41230;font-size:20px;font-weight:700;">ᛁ</span>
            <span style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.12em;margin-left:8px;">IR</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 48px;">
            <p style="color:rgba(255,255,255,0.4);font-size:9px;letter-spacing:0.18em;margin:0 0 20px;">TEAM INVITATION</p>
            <h1 style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.02em;margin:0 0 16px;font-family:sans-serif;">You've been invited to ${esc(teamName)}.</h1>
            <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.7;margin:0 0 32px;font-family:sans-serif;">
              Accept the invitation to join your team on IR and start tracking federal contracts together.
            </p>
            <a href="${link}"
               style="display:inline-block;padding:14px 32px;background:#C41230;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.1em;text-decoration:none;">
              ACCEPT INVITATION →
            </a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  await send(email, `You've been invited to join ${teamName} on IR`, html)
}
