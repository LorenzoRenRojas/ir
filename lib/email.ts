// Email sending via Resend (https://resend.com).
// Set RESEND_API_KEY in environment variables.
// Free tier: 3,000 emails/month, 100/day.
// From address must be from a verified domain in your Resend account.

const FROM = 'IR <noreply@ir-gov.app>'
const RESEND_API = 'https://api.resend.com/emails'

async function send(to: string, subject: string, html: string): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    // In development without a key, log the email instead of failing
    console.log(`[email] To: ${to} | Subject: ${subject}`)
    return
  }

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend API error ${res.status}: ${body}`)
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
            <h1 style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.02em;margin:0 0 16px;font-family:sans-serif;">You've been invited to ${teamName}.</h1>
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
