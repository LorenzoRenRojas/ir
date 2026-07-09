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

  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html, ...(replyTo ? { reply_to: [replyTo] } : {}) }),
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
  const previewLines = esc(content.split('\n').slice(0, 8).join('\n'))

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
}

export async function sendDailyDigestEmail(
  email: string,
  name: string | null,
  matches: DigestMatch[],
  baseUrl: string,
  userId?: string
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
            <pre style="font-family:'Courier New',monospace;font-size:12px;line-height:1.6;white-space:pre-wrap;color:#1a1a1a;margin:0 0 24px;">${esc(content)}</pre>
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
