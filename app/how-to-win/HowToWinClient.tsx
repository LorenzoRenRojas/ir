'use client'

import MetatronBackdrop from '@/components/MetatronBackdrop'
import { MarketingNav, MarketingCta, useInView, mono, sans, crimson, surface } from '@/components/marketing'

// Public "how to win" page — strategic and credible, written to be read by a
// first-time bidder AND a capture manager at an established shop. The in-app
// /playbook is the tactical do-this-now checklist; this one sells the play.

const PHASES = [
  {
    n: '01', title: 'SET THE YARDSTICK', tag: 'ONCE',
    you: 'Register in SAM.gov and pursue any set-aside certification you qualify for. Paste your UEI into IR and finish your capability statement.',
    ir: 'IR auto-fills your profile from your SAM.gov registration and turns it into the yardstick every contract is scored against.',
    why: 'On a set-aside, your competition collapses from thousands of firms to a handful. This step decides everything downstream.',
  },
  {
    n: '02', title: 'FIND WINNABLE WORK', tag: 'DAILY',
    you: 'Open the feed and read the highest-scored matches. Filter to what you can prime.',
    ir: 'Every solicitation IR tracks from SAM.gov, scored against your profile and ranked best-first — with the reasoning shown, factor by factor.',
    why: 'You cannot win what you never see. Most small businesses miss the majority of the work they qualify for.',
  },
  {
    n: '03', title: 'SEE IT BEFORE IT EXISTS', tag: 'WEEKLY',
    you: 'Check Recompete Radar for contracts in your space expiring in 6–18 months. Start building the relationship now.',
    ir: 'IR reads the government’s own award data, finds expiring contracts in your NAICS, names the incumbent and what they were paid, and scores each one.',
    why: 'This is how the same firms keep winning — they are positioned before the RFP exists. IR hands that head start to a five-person shop.',
  },
  {
    n: '04', title: 'DECIDE WITH DISCIPLINE', tag: 'PER BID',
    you: 'On a contract you like, weigh the win probability, the incumbent, and the market — then run the bid/no-bid scorecard.',
    ir: 'Win-probability read, incumbent intelligence, market concentration, and a structured bid/no-bid scorecard on every opportunity.',
    why: 'Winning is as much about the bids you skip as the ones you chase. Spend your hours only on winnable work.',
  },
  {
    n: '05', title: 'RESPOND, ON TIME', tag: 'PER BID',
    you: 'Bring your technical approach, past performance, and price. Generate the paperwork, review it, and submit before the deadline.',
    ir: 'One-click capability statements and a guided four-volume proposal, structured to federal norms — tracked in your pipeline with deadline alerts at 3 days and 24 hours.',
    why: 'A shocking number of small-business bids die on a missed deadline or a half-finished proposal. Throughput wins contracts.',
  },
]

function DualAudience() {
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  const cards = [
    { k: 'NEW TO FEDERAL', h: 'Win your first contract.', b: 'You don’t need a capture team or a consultant. IR shows you the work you actually qualify for, tells you which certification unlocks the most, and drafts the paperwork so your first bid isn’t a blank page.' },
    { k: 'ESTABLISHED CONTRACTOR', h: 'Scale your pipeline.', b: 'Replace the analyst subscriptions and the manual SAM.gov grind with one system your whole team runs on — recompete intelligence, a shared pipeline, and proposal drafting, without the five-figure enterprise invoice.' },
  ]
  return (
    <div ref={ref} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
      {cards.map((c, i) => (
        <div key={c.k} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.09)', borderTop: `3px solid ${crimson}`, padding: '32px 30px', opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(18px)', transition: `all 0.55s cubic-bezier(0.22,1,0.36,1) ${i * 140}ms` }}>
          <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.16em', color: crimson, marginBottom: 14 }}>{c.k}</div>
          <h3 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 12px', fontFamily: sans, color: '#fff' }}>{c.h}</h3>
          <p style={{ fontSize: 14, lineHeight: 1.75, color: 'rgba(255,255,255,0.5)', margin: 0, fontFamily: sans }}>{c.b}</p>
        </div>
      ))}
    </div>
  )
}

function Play() {
  const { ref, inView } = useInView<HTMLDivElement>(0.12)
  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {PHASES.map((p, i) => (
        <div key={p.n} style={{ border: '1px solid rgba(255,255,255,0.09)', background: '#111', padding: '30px 32px', position: 'relative', opacity: inView ? 1 : 0, transform: inView ? 'translateX(0)' : 'translateX(-18px)', transition: `all 0.5s cubic-bezier(0.22,1,0.36,1) ${i * 110}ms` }}>
          <div style={{ position: 'absolute', top: 0, left: 0, height: 2, background: crimson, width: inView ? '100%' : '0%', transition: `width 0.5s ease ${i * 110 + 200}ms` }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
              <span style={{ fontFamily: mono, fontSize: 12, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>{p.n}</span>
              <h3 style={{ fontFamily: sans, fontSize: 'clamp(20px, 2.4vw, 26px)', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff', margin: 0 }}>{p.title}</h3>
            </div>
            <span style={{ fontFamily: mono, fontSize: 8.5, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.14)', padding: '3px 8px', whiteSpace: 'nowrap' }}>{p.tag}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            <div>
              <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>YOU BRING</div>
              <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'rgba(255,255,255,0.55)', margin: 0, fontFamily: sans }}>{p.you}</p>
            </div>
            <div>
              <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.14em', color: crimson, marginBottom: 8 }}>IR PROVIDES</div>
              <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'rgba(255,255,255,0.7)', margin: 0, fontFamily: sans }}>{p.ir}</p>
            </div>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.4)', margin: '18px 0 0', fontFamily: sans, fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>{p.why}</p>
        </div>
      ))}
    </div>
  )
}

export default function HowToWinClient() {
  return (
    <div style={{ minHeight: '100vh', background: surface, color: '#fff', fontFamily: mono }}>
      <MetatronBackdrop pulse />
      <MarketingNav section="HOW TO WIN" />

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 28px', position: 'relative', zIndex: 1 }}>
        {/* Hero */}
        <section style={{ padding: '88px 0 56px' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.18em', color: crimson, margin: '0 0 16px', fontFamily: mono }}>THE PLAYBOOK</p>
          <h1 style={{ fontSize: 'clamp(34px, 5vw, 60px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.08, margin: '0 0 20px', fontFamily: sans }}>
            How small businesses<br /><span style={{ color: crimson }}>win federal contracts.</span>
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.8, color: 'rgba(255,255,255,0.5)', maxWidth: 680, margin: '0 0 8px', fontFamily: sans }}>
            Winning federal work isn&apos;t luck or connections — it&apos;s a repeatable play. Here is the exact
            one IR is built to run, whether you&apos;re chasing your first award or your five-hundredth.
          </p>
        </section>

        {/* Dual audience */}
        <section style={{ padding: '16px 0 64px' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 22px', fontFamily: mono }}>ONE SYSTEM · EVERY STAGE</p>
          <DualAudience />
        </section>

        {/* The play */}
        <section style={{ padding: '16px 0 56px' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 14px', fontFamily: mono }}>THE FIVE-PHASE PLAY</p>
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 40px', fontFamily: sans }}>
            Find. Foresee. Decide. Respond. Compound.
          </h2>
          <Play />
        </section>

        {/* Honest line */}
        <section style={{ padding: '24px 0 56px' }}>
          <div style={{ border: '1px solid rgba(196,18,48,0.3)', background: 'rgba(196,18,48,0.05)', padding: '30px 32px' }}>
            <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.14em', color: crimson, marginBottom: 14 }}>WHAT IR IS — AND ISN&apos;T</div>
            <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', lineHeight: 1.7, color: '#fff', margin: 0, fontFamily: sans, fontWeight: 600, letterSpacing: '-0.01em' }}>
              IR doesn&apos;t write your winning proposal or set your price. It makes sure you see every winnable
              contract, waste zero time on the unwinnable ones, get positioned before your competitors know it
              exists, and get the paperwork out on time.
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.75, color: 'rgba(255,255,255,0.5)', margin: '16px 0 0', fontFamily: sans }}>
              You bring the capability, the price, and the relationships. IR is the operating system that makes
              your effort count two to three times more.
            </p>
          </div>
        </section>

        <MarketingCta headline="Run the play. Start free." sub="Your SAM.gov UEI builds your profile in about 40 seconds. First matches in five minutes." />
      </div>
    </div>
  )
}
