import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Security | IR',
  description: 'How IR protects your data: encryption, authentication, data handling, and our security roadmap — in plain English.',
  alternates: { canonical: 'https://ir-gov.app/security' },
}

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

const SECTIONS: { title: string; items: string[] }[] = [
  {
    title: 'DATA IN TRANSIT & AT REST',
    items: [
      'All traffic is encrypted with TLS 1.2+ — there is no unencrypted access to IR.',
      'Data is stored on SOC 2-compliant infrastructure (Vercel and Turso) with encryption at rest.',
      'Passwords are hashed with bcrypt (cost factor 12). We cannot see or recover your password.',
    ],
  },
  {
    title: 'AUTHENTICATION & ACCESS',
    items: [
      'Sessions use signed JSON Web Tokens; session secrets are rotated server-side and never exposed to the browser.',
      'Authentication endpoints are rate-limited to block credential stuffing and brute force.',
      'Email verification is required before account access.',
      'Team access is permission-scoped: members only see what their role allows.',
    ],
  },
  {
    title: 'YOUR DATA',
    items: [
      'Contract data comes from public U.S. government sources (SAM.gov). Your company profile, pipeline, and proposals are private to you and your team.',
      'We never sell your data. We never share your proposals, pipeline, or profile with anyone — including other IR customers.',
      'Proposal emails to contracting officers are sent only when you explicitly click send, after a confirmation showing the exact recipient.',
      'You can delete your account and all associated data at any time by contacting us.',
    ],
  },
  {
    title: 'ENGINEERING PRACTICES',
    items: [
      'All database access goes through a typed ORM with parameterized queries — no raw SQL from user input.',
      'API keys and secrets live in server-side environment variables, never in client code.',
      'Every outbound email is logged and auditable.',
      'Automated health checks monitor the platform continuously and alert us before most issues reach you.',
    ],
  },
  {
    title: 'ON THE ROADMAP (HONEST VERSION)',
    items: [
      'Two-factor authentication (2FA) — planned.',
      'SOC 2 Type II certification — planned as we grow; our infrastructure providers already hold it.',
      'Formal penetration testing — planned before enterprise rollout.',
      'We would rather tell you what we don\'t have yet than pretend. If your organization has specific security requirements, email us and we\'ll give you straight answers.',
    ],
  },
]

export default function SecurityPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: mono }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '48px clamp(20px, 5vw, 48px) 96px' }}>
        <div style={{ marginBottom: 48 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ color: crimson, fontSize: 20, fontWeight: 700 }}>ᛁ</span>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', marginLeft: 8 }}>IR</span>
          </Link>
        </div>

        <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 16px' }}>SECURITY</p>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 16px', fontFamily: sans }}>
          How we protect your data.
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, lineHeight: 1.7, margin: '0 0 56px', fontFamily: sans }}>
          You&apos;re trusting IR with your pipeline and your proposals. Here is exactly how that data is
          handled — in plain English, including what we haven&apos;t built yet.
        </p>

        {SECTIONS.map(section => (
          <div key={section.title} style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 9, letterSpacing: '0.18em', color: crimson, margin: '0 0 16px', fontWeight: 700 }}>{section.title}</p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {section.items.map((item, i) => (
                <li key={i} style={{ display: 'flex', gap: 12, fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.55)', fontFamily: sans }}>
                  <span style={{ color: crimson, flexShrink: 0, fontWeight: 700 }}>—</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div style={{ marginTop: 24, padding: 28, border: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 12px' }}>REPORT A VULNERABILITY</p>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.55)', margin: 0, fontFamily: sans }}>
            Found a security issue? Email <a href="mailto:security@ir-gov.app" style={{ color: crimson }}>security@ir-gov.app</a> and
            we&apos;ll respond within 48 hours. We appreciate responsible disclosure and will credit researchers who report in good faith.
          </p>
        </div>
      </div>
    </div>
  )
}
