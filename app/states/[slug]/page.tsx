import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { STATES, getState, contractMatchesState } from '@/lib/states'
import { fetchContracts } from '@/lib/sam-api'

// Re-render at most every 6h — matches the SAM.gov cache window
export const revalidate = 21600

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

export function generateStaticParams() {
  return STATES.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const entry = getState(slug)
  if (!entry) return { title: 'State Not Found | IR' }
  return {
    title: `Government Contracts in ${entry.name} — Live Federal Opportunities | IR`,
    description: `Federal contract opportunities in ${entry.name}, updated daily from SAM.gov: what the government buys in ${entry.name}, where the spending comes from, and the postings live right now. IR scores each one against your business.`,
    alternates: { canonical: `https://ir-gov.app/states/${entry.slug}` },
  }
}

export default async function StatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const entry = getState(slug)
  if (!entry) notFound()

  const all = await fetchContracts()
  const contracts = all.filter((c) => contractMatchesState(c, entry)).slice(0, 20)

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `How do I find government contracts in ${entry.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Federal opportunities with a place of performance in ${entry.name} post to SAM.gov. ${entry.footprint} IR tracks these postings daily and scores each one against your business profile.`,
        },
      },
      {
        '@type': 'Question',
        name: `What does the federal government buy in ${entry.name}?`,
        acceptedAnswer: { '@type': 'Answer', text: entry.footprint },
      },
    ],
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: mono }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px clamp(20px, 5vw, 48px) 96px' }}>
        <div style={{ marginBottom: 48 }}>
          <Link href="/states" style={{ textDecoration: 'none' }}>
            <span style={{ color: crimson, fontSize: 20, fontWeight: 700 }}>ᛁ</span>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', marginLeft: 8 }}>IR</span>
          </Link>
        </div>

        <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 16px' }}>
          GOVERNMENT CONTRACTS · {entry.code}
        </p>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 16px', fontFamily: sans }}>
          Federal contracts in {entry.name}.
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 1.8, margin: '0 0 12px', maxWidth: 680, fontFamily: sans }}>
          {entry.footprint}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, lineHeight: 1.7, margin: '0 0 48px', maxWidth: 640, fontFamily: sans }}>
          IR watches every posting with {entry.name} performance, scores it against your company
          profile, and drafts your proposal — so you spend your hours bidding, not searching.
        </p>

        <div style={{ display: 'flex', gap: 12, marginBottom: 64, flexWrap: 'wrap' }}>
          <Link href="/register" style={{ padding: '14px 32px', background: crimson, color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none' }}>
            GET MATCHED FREE →
          </Link>
          <Link href="/states" style={{ padding: '14px 32px', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none' }}>
            ALL STATES
          </Link>
        </div>

        <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 20px' }}>
          {contracts.length > 0 ? `ACTIVE OPPORTUNITIES IN ${entry.name.toUpperCase()} (${contracts.length})` : 'ACTIVE OPPORTUNITIES'}
        </p>

        {contracts.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, fontFamily: sans, marginBottom: 8 }}>
            No {entry.name} postings in the current window. New opportunities post daily —
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

        <div style={{ marginTop: 64, padding: '32px', border: '1px solid rgba(196,18,48,0.3)', background: 'rgba(196,18,48,0.04)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px', fontFamily: sans }}>
            Win federal work in {entry.name}.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px', fontFamily: sans }}>
            Create a free profile and IR will score every {entry.name} opportunity against your
            business — and email you when a real match posts.
          </p>
          <Link href="/register" style={{ display: 'inline-block', padding: '13px 28px', background: crimson, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none' }}>
            START FREE →
          </Link>
        </div>
      </div>
    </div>
  )
}
