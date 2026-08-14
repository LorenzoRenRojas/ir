import type { Metadata } from 'next'
import Link from 'next/link'
import { CHANGELOG } from '@/lib/changelog'

export const metadata: Metadata = {
  title: 'Changelog | IR',
  description: 'You said, we shipped. Every improvement to IR, in the open — including the ones that came straight from member feedback.',
  alternates: { canonical: 'https://ir-gov.app/changelog' },
}

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ChangelogPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: mono }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '48px clamp(20px, 5vw, 48px) 96px' }}>
        <div style={{ marginBottom: 48 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ color: crimson, fontSize: 20, fontWeight: 700 }}>ᛁ</span>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', marginLeft: 8 }}>IR</span>
          </Link>
        </div>

        <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 16px' }}>CHANGELOG</p>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 16px', fontFamily: sans }}>
          You said. We shipped.
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, lineHeight: 1.7, margin: '0 0 56px', fontFamily: sans }}>
          Every improvement to IR, in the open. Entries marked{' '}
          <span style={{ color: crimson, fontWeight: 700, fontSize: 12, letterSpacing: '0.08em', fontFamily: mono }}>FROM YOUR FEEDBACK</span>{' '}
          came directly from member notes — send yours from the feedback button on any dashboard page.
        </p>

        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.12)', paddingLeft: 28, display: 'flex', flexDirection: 'column', gap: 40 }}>
          {CHANGELOG.map((entry, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: -33, top: 5, width: 9, height: 9, background: entry.fromFeedback ? crimson : 'rgba(255,255,255,0.25)', borderRadius: 2, transform: 'rotate(45deg)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                <span style={{ fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)' }}>{fmtDate(entry.date).toUpperCase()}</span>
                {entry.fromFeedback && (
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', color: crimson, border: '1px solid rgba(196,18,48,0.4)', padding: '2px 7px' }}>
                    FROM YOUR FEEDBACK
                  </span>
                )}
              </div>
              <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', margin: '0 0 8px', fontFamily: sans }}>{entry.title}</h2>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.5)', margin: 0, fontFamily: sans }}>{entry.body}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 64, padding: 28, border: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 12px' }}>WANT SOMETHING ON THIS PAGE?</p>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.55)', margin: 0, fontFamily: sans }}>
            Founding members steer the roadmap. <Link href="/register" style={{ color: crimson }}>Join the early access</Link> and
            use the feedback button — what you ask for tends to show up here.
          </p>
        </div>
      </div>
    </div>
  )
}
