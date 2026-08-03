import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SET_ASIDES, getSetAside, contractMatchesSetAside } from '@/lib/set-asides'
import { fetchContracts } from '@/lib/sam-api'

// Re-render at most every 6h — matches the SAM.gov cache window
export const revalidate = 21600

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

export function generateStaticParams() {
  return SET_ASIDES.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const entry = getSetAside(slug)
  if (!entry) return { title: 'Set-Aside Program Not Found | IR' }
  return {
    title: `${entry.name} Contracts — Live ${entry.abbr} Opportunities | IR`,
    description: `Live ${entry.abbr} set-aside federal contracts, updated daily from SAM.gov, plus who qualifies and how to get certified. IR scores every posting against your business and drafts your proposal.`,
    alternates: { canonical: `https://ir-gov.app/set-asides/${entry.slug}` },
  }
}

export default async function SetAsidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const entry = getSetAside(slug)
  if (!entry) notFound()

  const all = await fetchContracts()
  const contracts = all.filter((c) => contractMatchesSetAside(c, entry)).slice(0, 20)

  // FAQ structured data — "who qualifies" + "how to certify" are exactly what
  // people search, so mark them up for a chance at a rich result.
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What is the ${entry.name}?`,
        acceptedAnswer: { '@type': 'Answer', text: entry.whatItIs },
      },
      {
        '@type': 'Question',
        name: `Who qualifies for ${entry.abbr} set-aside contracts?`,
        acceptedAnswer: { '@type': 'Answer', text: entry.whoQualifies.join('. ') + '.' },
      },
      {
        '@type': 'Question',
        name: `How do I get ${entry.abbr} certified?`,
        acceptedAnswer: { '@type': 'Answer', text: entry.certPath },
      },
    ],
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: mono }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px clamp(20px, 5vw, 48px) 96px' }}>
        <div style={{ marginBottom: 48 }}>
          <Link href="/set-asides" style={{ textDecoration: 'none' }}>
            <span style={{ color: crimson, fontSize: 20, fontWeight: 700 }}>ᛁ</span>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', marginLeft: 8 }}>IR</span>
          </Link>
        </div>

        <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 16px' }}>
          SET-ASIDE PROGRAM · {entry.abbr.toUpperCase()}
        </p>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 16px', fontFamily: sans }}>
          {entry.name} contracts.
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 16, lineHeight: 1.7, margin: '0 0 12px', maxWidth: 640, fontFamily: sans }}>
          {entry.tagline}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, lineHeight: 1.7, margin: '0 0 48px', maxWidth: 640, fontFamily: sans }}>
          IR scores every {entry.abbr} posting against your company profile, flags the ones you’re
          eligible to win, and drafts your proposal — so you spend your hours bidding, not searching.
        </p>

        <div style={{ display: 'flex', gap: 12, marginBottom: 64, flexWrap: 'wrap' }}>
          <Link href="/register" style={{ padding: '14px 32px', background: crimson, color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none' }}>
            GET MATCHED FREE →
          </Link>
          <Link href="/set-asides" style={{ padding: '14px 32px', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none' }}>
            ALL SET-ASIDES
          </Link>
        </div>

        {/* Live opportunities */}
        <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 20px' }}>
          {contracts.length > 0 ? `ACTIVE ${entry.abbr.toUpperCase()} OPPORTUNITIES (${contracts.length})` : 'ACTIVE OPPORTUNITIES'}
        </p>

        {contracts.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, fontFamily: sans, marginBottom: 8 }}>
            No active {entry.abbr} postings in the current window. New set-asides post daily —
            <Link href="/register" style={{ color: crimson }}> create a free profile</Link> and IR will email you when one matches.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {contracts.map((c) => (
            <div key={c.id} style={{ border: '1px solid rgba(255,255,255,0.08)', padding: '20px 24px', background: '#111' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, fontFamily: sans, marginBottom: 6 }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                    {c.agency} · {c.setAsideDescription} · NAICS {c.naicsCode}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 6 }}>
                    Deadline: {new Date(c.responseDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {c.placeOfPerformance}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: crimson, fontFamily: sans }}>{c.valueFormatted}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Educational block — what earns the ranking and answers the searcher */}
        <div style={{ marginTop: 72 }}>
          <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 16px' }}>
            WHAT IS THE {entry.abbr.toUpperCase()} SET-ASIDE?
          </p>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 1.8, margin: '0 0 40px', maxWidth: 680, fontFamily: sans }}>
            {entry.whatItIs}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#111', padding: '28px 26px' }}>
              <p style={{ fontSize: 9, letterSpacing: '0.16em', color: crimson, margin: '0 0 16px', fontWeight: 700 }}>WHO QUALIFIES</p>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {entry.whoQualifies.map((q, i) => (
                  <li key={i} style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.6, fontFamily: sans }}>{q}</li>
                ))}
              </ul>
            </div>
            <div style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#111', padding: '28px 26px' }}>
              <p style={{ fontSize: 9, letterSpacing: '0.16em', color: crimson, margin: '0 0 16px', fontWeight: 700 }}>HOW TO GET CERTIFIED</p>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.7, margin: 0, fontFamily: sans }}>{entry.certPath}</p>
            </div>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, lineHeight: 1.6, margin: '20px 0 0', maxWidth: 680, fontFamily: sans }}>
            Program rules and thresholds are set by the SBA and can change — always confirm current
            eligibility and certification requirements at sba.gov before you rely on them.
          </p>
        </div>

        {/* CTA */}
        <div style={{ marginTop: 64, padding: '32px', border: '1px solid rgba(196,18,48,0.3)', background: 'rgba(196,18,48,0.04)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px', fontFamily: sans }}>
            Certified? Now find the work.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px', fontFamily: sans }}>
            IR watches every {entry.abbr} set-aside for you, scores each posting against your profile,
            and drafts the proposal when you find one worth bidding.
          </p>
          <Link href="/register" style={{ display: 'inline-block', padding: '13px 28px', background: crimson, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none' }}>
            START FREE →
          </Link>
        </div>
      </div>
    </div>
  )
}
