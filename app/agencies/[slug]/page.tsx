import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AGENCIES, getAgency, contractMatchesAgency } from '@/lib/agencies'
import { fetchContracts } from '@/lib/sam-api'

// Re-render at most every 6h — matches the SAM.gov cache window
export const revalidate = 21600

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

export function generateStaticParams() {
  return AGENCIES.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const entry = getAgency(slug)
  if (!entry) return { title: 'Agency Not Found | IR' }
  return {
    title: `Selling to the ${entry.abbr} — Live ${entry.name} Contracts | IR`,
    description: `How to sell to the ${entry.name} (${entry.abbr}): what they buy, how to win work, and live contract opportunities updated daily from SAM.gov. IR scores every posting against your business and drafts your proposal.`,
    alternates: { canonical: `https://ir-gov.app/agencies/${entry.slug}` },
  }
}

export default async function AgencyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const entry = getAgency(slug)
  if (!entry) notFound()

  const all = await fetchContracts()
  const contracts = all.filter((c) => contractMatchesAgency(c, entry)).slice(0, 20)

  // FAQ structured data — "what do they buy" + "how to sell to them" are exactly
  // what people search, so mark them up for a chance at a rich result.
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What does the ${entry.name} buy?`,
        acceptedAnswer: { '@type': 'Answer', text: entry.overview + ' Common purchases: ' + entry.buys.join('; ') + '.' },
      },
      {
        '@type': 'Question',
        name: `How do I sell to the ${entry.abbr}?`,
        acceptedAnswer: { '@type': 'Answer', text: entry.howToWin.join('. ') + '.' },
      },
    ],
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: mono }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px clamp(20px, 5vw, 48px) 96px' }}>
        <div style={{ marginBottom: 48 }}>
          <Link href="/agencies" style={{ textDecoration: 'none' }}>
            <span style={{ color: crimson, fontSize: 20, fontWeight: 700 }}>ᛁ</span>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', marginLeft: 8 }}>IR</span>
          </Link>
        </div>

        <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 16px' }}>
          FEDERAL AGENCY · {entry.abbr.toUpperCase()}
        </p>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 16px', fontFamily: sans }}>
          Selling to the {entry.abbr}.
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 16, lineHeight: 1.7, margin: '0 0 12px', maxWidth: 640, fontFamily: sans }}>
          {entry.tagline}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, lineHeight: 1.7, margin: '0 0 48px', maxWidth: 640, fontFamily: sans }}>
          IR scores every {entry.abbr} posting against your company profile, flags what you’re eligible
          to win, and drafts your proposal — so you spend your hours bidding, not searching.
        </p>

        <div style={{ display: 'flex', gap: 12, marginBottom: 64, flexWrap: 'wrap' }}>
          <Link href="/register" style={{ padding: '14px 32px', background: crimson, color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none' }}>
            GET MATCHED FREE →
          </Link>
          <Link href="/agencies" style={{ padding: '14px 32px', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none' }}>
            ALL AGENCIES
          </Link>
        </div>

        {/* Live opportunities */}
        <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 20px' }}>
          {contracts.length > 0 ? `ACTIVE ${entry.abbr.toUpperCase()} OPPORTUNITIES (${contracts.length})` : 'ACTIVE OPPORTUNITIES'}
        </p>

        {contracts.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, fontFamily: sans, marginBottom: 8 }}>
            No active {entry.abbr} postings in the current window. New opportunities post daily —
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
            ABOUT THE {entry.abbr.toUpperCase()}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 1.8, margin: '0 0 40px', maxWidth: 680, fontFamily: sans }}>
            {entry.overview}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#111', padding: '28px 26px' }}>
              <p style={{ fontSize: 9, letterSpacing: '0.16em', color: crimson, margin: '0 0 16px', fontWeight: 700 }}>WHAT THEY BUY</p>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {entry.buys.map((b, i) => (
                  <li key={i} style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.6, fontFamily: sans }}>{b}</li>
                ))}
              </ul>
            </div>
            <div style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#111', padding: '28px 26px' }}>
              <p style={{ fontSize: 9, letterSpacing: '0.16em', color: crimson, margin: '0 0 16px', fontWeight: 700 }}>HOW TO WIN WORK</p>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {entry.howToWin.map((h, i) => (
                  <li key={i} style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.6, fontFamily: sans }}>{h}</li>
                ))}
              </ul>
            </div>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, lineHeight: 1.6, margin: '20px 0 0', maxWidth: 680, fontFamily: sans }}>
            Agencies organize and buy in their own ways, and priorities shift with budgets — confirm
            current requirements on the official solicitation before you rely on them.
          </p>
        </div>

        {/* CTA */}
        <div style={{ marginTop: 64, padding: '32px', border: '1px solid rgba(196,18,48,0.3)', background: 'rgba(196,18,48,0.04)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px', fontFamily: sans }}>
            Make the {entry.abbr} your customer.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px', fontFamily: sans }}>
            IR watches every {entry.abbr} posting for you, scores each one against your profile, and
            drafts the proposal when you find one worth bidding.
          </p>
          <Link href="/register" style={{ display: 'inline-block', padding: '13px 28px', background: crimson, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none' }}>
            START FREE →
          </Link>
        </div>
      </div>
    </div>
  )
}
