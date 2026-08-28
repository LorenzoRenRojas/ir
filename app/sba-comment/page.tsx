import type { Metadata } from 'next'
import Link from 'next/link'
import CommentBuilder from './CommentBuilder'

export const metadata: Metadata = {
  title: 'SBA Size Standards Comment Builder — Free, No Signup | IR',
  description:
    'SBA has proposed consolidating 995 size standards into 338 and making 114,541 more firms eligible as small businesses. Comments close September 21, 2026. Build a properly formatted public comment in two minutes — free, no signup, any position.',
  alternates: { canonical: 'https://ir-gov.app/sba-comment' },
  openGraph: {
    title: 'Comment on the SBA size standards rule before September 21',
    description:
      'A free builder for the public comment record on RIN 3245-AI67. No signup, no account, and it works whether you support the rule or oppose it.',
    url: 'https://ir-gov.app/sba-comment',
  },
}

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

// Every number on this page comes from the proposed rule published in the
// Federal Register on 2026-08-20 under RIN 3245-AI67, cross-checked against
// law firm summaries (Pillsbury, Holland & Knight, Hunton, Schwabe, Potomac
// Law) and SBA Office of Advocacy material. Do not add a figure here that is
// not traceable to that set. The rule is PROPOSED and every mention says so.
const FACTS: { stat: string; body: string }[] = [
  {
    stat: '995 → 338',
    body:
      'Existing industry size standards would be consolidated into 338, set at the 4 and 5 digit NAICS level rather than the 6 digit level used today.',
  },
  {
    stat: '114,541',
    body:
      'Additional firms would become eligible as small businesses. Fewer than 200 firms would lose eligibility, spread across 24 industry groups.',
  },
  {
    stat: '37,002',
    body:
      'Of the newly eligible firms, roughly 37,002 already hold federal contracts — 105,655 contracts worth more than $71 billion in FY2025.',
  },
  {
    stat: '+1.8%',
    body:
      'Total firms meeting a small business size standard would rise from 6,344,967 to 6,459,508.',
  },
]

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: '01',
    title: 'Build your comment below',
    body:
      'Pick your position, select the points that actually apply to your business, and write the part that only you can write. Then copy it.',
  },
  {
    n: '02',
    title: 'Go to regulations.gov',
    body:
      'Search for Docket SBA-2026-0199 or RIN 3245-AI67. Open the proposed rule and use the Comment button on the docket page.',
  },
  {
    n: '03',
    title: 'Paste, review, submit',
    body:
      'Comments are part of the public record and are posted publicly, including anything identifying you. There is no fee and no account required. SBA must receive it on or before September 21, 2026.',
  },
]

export default function SbaCommentPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: mono }}>
      <div style={{ maxWidth: 940, margin: '0 auto', padding: '48px clamp(20px, 5vw, 48px) 96px' }}>
        <div style={{ marginBottom: 48 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ color: crimson, fontSize: 20, fontWeight: 700 }}>ᛁ</span>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', marginLeft: 8 }}>IR</span>
          </Link>
        </div>

        <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 16px' }}>
          PUBLIC COMMENT BUILDER · RIN 3245-AI67
        </p>
        <h1
          style={{
            fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, letterSpacing: '-0.025em',
            margin: '0 0 18px', fontFamily: sans, lineHeight: 1.12, maxWidth: 780,
          }}
        >
          SBA wants to redraw what counts as a small business. You get a say until September 21.
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15.5, lineHeight: 1.75, margin: '0 0 44px', maxWidth: 660, fontFamily: sans }}>
          This is a proposed rule, not law. Federal agencies are required to read and respond to
          substantive public comments before finalizing one, and the record is thin compared to the
          number of firms this would affect. The builder below assembles a properly formatted comment
          in about two minutes, whether you support the rule, oppose it, or land somewhere in between.
          Free, no signup, nothing stored.
        </p>

        {/* What the rule proposes */}
        <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 20px' }}>
          WHAT THE PROPOSAL ACTUALLY SAYS
        </p>
        <div
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 14, marginBottom: 28,
          }}
        >
          {FACTS.map(f => (
            <div
              key={f.stat}
              style={{
                border: '1px solid rgba(255,255,255,0.09)', background: '#111',
                padding: '22px 22px 24px', borderRadius: 8,
              }}
            >
              <div style={{ color: crimson, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12, fontFamily: sans }}>
                {f.stat}
              </div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'rgba(255,255,255,0.5)', fontFamily: sans }}>
                {f.body}
              </p>
            </div>
          ))}
        </div>

        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13.5, lineHeight: 1.75, margin: '0 0 12px', maxWidth: 720, fontFamily: sans }}>
          The proposal also removes the ceiling on size standards and applies a productivity
          adjustment on top of inflation, which is why the increases run well past what an inflation
          update alone would produce. No size standard is reduced.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12, lineHeight: 1.7, margin: '0 0 52px', maxWidth: 720, fontFamily: sans }}>
          Source: proposed rule published in the Federal Register on August 20, 2026, RIN 3245-AI67 /
          Docket No. SBA-2026-0199. SBA issued two related rules that day — an industry size standards
          rule and a revised methodology rule. The figures above are from the rule carrying this RIN.
          Read the rule yourself before commenting; nothing here is legal advice.
        </p>

        {/* How to file */}
        <p style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 20px' }}>
          HOW TO ACTUALLY FILE ONE
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 56 }}>
          {STEPS.map(s => (
            <div key={s.n} style={{ border: '1px solid rgba(255,255,255,0.09)', padding: '22px 22px 24px', borderRadius: 8 }}>
              <div style={{ color: 'rgba(255,255,255,0.22)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', marginBottom: 12 }}>
                {s.n}
              </div>
              <p style={{ margin: '0 0 8px', fontSize: 14.5, fontWeight: 700, color: '#fff', fontFamily: sans }}>{s.title}</p>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'rgba(255,255,255,0.45)', fontFamily: sans }}>{s.body}</p>
            </div>
          ))}
        </div>

        <CommentBuilder />

        <p
          style={{
            color: 'rgba(255,255,255,0.22)', fontSize: 11.5, lineHeight: 1.75,
            margin: '52px 0 0', maxWidth: 720, fontFamily: sans,
            borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 26,
          }}
        >
          IR is an independent commercial website and is not affiliated with, endorsed by, or
          officially associated with the U.S. Small Business Administration or any other federal
          agency. This page is provided as a free public resource and takes no position on the rule.
          Nothing here is legal advice. Your comment is drafted in your browser and is not sent to us
          or stored on our servers — you submit it yourself on regulations.gov.
        </p>
      </div>
    </div>
  )
}
