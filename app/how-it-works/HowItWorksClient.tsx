'use client'

import MetatronBackdrop from '@/components/MetatronBackdrop'
import { useInView, CountUp, MarketingNav, MarketingCta, mono, sans, crimson, surface } from '@/components/marketing'

// ─── Signal funnel: the market narrowing to your inbox ───────────────────────
const FUNNEL = [
  { label: 'ACTIVE FEDERAL NOTICES ON SAM.GOV', value: 261000, display: '261,000+', width: 100 },
  { label: 'RECENT WINDOW SYNCED TO IR DAILY', value: 3000, display: '~3,000', width: 62 },
  { label: 'SCORED AGAINST YOUR PROFILE', value: 3000, display: 'ALL OF THEM', width: 38 },
  { label: 'STRONG MATCHES SURFACED', value: 40, display: 'YOUR SHORTLIST', width: 18 },
  { label: 'TOP MATCHES EMAILED EACH MORNING', value: 5, display: 'TOP 5', width: 8 },
]

function SignalFunnel() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3)
  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {FUNNEL.map((row, i) => (
        <div key={row.label}>
          <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>
            {row.label}
          </div>
          <div style={{ position: 'relative', height: 34 }}>
            <div
              style={{
                position: 'absolute', inset: '0 auto 0 0',
                width: inView ? `${row.width}%` : '0%',
                minWidth: 60,
                background: i === FUNNEL.length - 1 ? crimson : `rgba(196,18,48,${0.16 + i * 0.12})`,
                borderRadius: '0 4px 4px 0',
                transition: `width 0.9s cubic-bezier(0.22,1,0.36,1) ${i * 140}ms`,
                display: 'flex', alignItems: 'center', paddingLeft: 14,
              }}
            >
              <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{row.display}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── The scoring formula: 40 / 25 / 20 / 15 ───────────────────────────────────
const FACTORS = [
  { label: 'NAICS ALIGNMENT', pts: 40, desc: 'Graduated by code depth: exact 6-digit match earns 40, same industry group 28, same subsector 20, same sector 10. The heaviest signal because it decides whether you can credibly perform the work.' },
  { label: 'SET-ASIDE ELIGIBILITY', pts: 25, desc: '8(a), SDVOSB, WOSB, HUBZone, small business — if the contract is set aside and you qualify, competition collapses to a fraction of the market. If you don\'t, we tell you what certification it takes.' },
  { label: 'CONTRACT SIZE FIT', pts: 20, desc: 'Distance-graduated against the award sizes you can staff and finance: in-range 20, one band away 10. When the government doesn\'t post a value — most notices — you get neutral credit, never a penalty.' },
  { label: 'GEOGRAPHY', pts: 15, desc: 'Place of performance mapped against your regions — states, multi-state regions like DC Metro or Southeast, remote, CONUS. State codes and region names both resolve.' },
]

function ScoringBar() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3)
  return (
    <div ref={ref}>
      {/* Segmented 100-point bar */}
      <div style={{ display: 'flex', height: 44, gap: 2, marginBottom: 28 }}>
        {FACTORS.map((f, i) => (
          <div
            key={f.label}
            style={{
              width: inView ? `${f.pts}%` : '0%',
              background: `rgba(196,18,48,${1 - i * 0.22})`,
              borderRadius: i === 0 ? '4px 0 0 4px' : i === FACTORS.length - 1 ? '0 4px 4px 0' : 0,
              transition: `width 0.8s cubic-bezier(0.22,1,0.36,1) ${i * 130}ms`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}
          >
            <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' }}>
              {inView ? f.pts : 0}
            </span>
          </div>
        ))}
      </div>
      {/* Factor explanations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
        {FACTORS.map((f, i) => (
          <div key={f.label} style={{ border: '1px solid rgba(255,255,255,0.09)', background: '#111', padding: '20px 22px', opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(14px)', transition: `all 0.5s ease ${i * 120 + 300}ms` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: crimson }}>{f.label}</span>
              <span style={{ fontFamily: mono, fontSize: 16, fontWeight: 800, color: '#fff' }}>{f.pts}<span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}> PTS</span></span>
            </div>
            <p style={{ fontSize: 12.5, lineHeight: 1.7, color: 'rgba(255,255,255,0.45)', margin: 0, fontFamily: sans }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── A day on IR: the automated timeline ─────────────────────────────────────
const TIMELINE = [
  { time: '12:00 UTC', title: 'MARKET SYNC', body: 'IR pulls thousands of fresh notices from SAM.gov into its contract store — budget-managed so the feed never rate-limits.' },
  { time: '+ SECONDS', title: 'SCORING PASS', body: 'Every stored contract is scored against every user profile: NAICS, set-asides, size, geography.' },
  { time: 'YOUR MORNING', title: 'MATCH DIGEST', body: 'New contracts scoring 55+ land in your inbox. No login required to know what happened overnight.' },
  { time: 'T-MINUS 3 DAYS', title: 'DEADLINE ALERT', body: 'Anything in your pipeline nearing its response deadline pings you automatically — again at 24 hours.' },
  { time: 'CONTINUOUS', title: 'RECOMPETE RADAR', body: 'Awards in your NAICS codes expiring within 18 months surface with incumbent and value — before the RFP exists.' },
]

function DayTimeline() {
  const { ref, inView } = useInView<HTMLDivElement>(0.15)
  return (
    <div ref={ref} style={{ position: 'relative', paddingLeft: 28 }}>
      <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 2, background: 'rgba(255,255,255,0.08)' }}>
        <div style={{ width: '100%', height: inView ? '100%' : '0%', background: crimson, transition: 'height 1.6s cubic-bezier(0.22,1,0.36,1) 0.2s' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {TIMELINE.map((t, i) => (
          <div key={t.title} style={{ position: 'relative', opacity: inView ? 1 : 0, transform: inView ? 'translateX(0)' : 'translateX(-12px)', transition: `all 0.5s ease ${i * 220 + 200}ms` }}>
            <div style={{ position: 'absolute', left: -27, top: 4, width: 12, height: 12, borderRadius: '50%', background: surface, border: `3px solid ${crimson}` }} />
            <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', color: crimson, marginBottom: 6 }}>{t.time}</div>
            <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#fff', marginBottom: 6 }}>{t.title}</div>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.45)', margin: 0, maxWidth: 560, fontFamily: sans }}>{t.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HowItWorksClient() {
  const hero = useInView<HTMLDivElement>(0.2)
  return (
    <div style={{ minHeight: '100vh', background: surface, color: '#fff', fontFamily: mono }}>
      <MetatronBackdrop />
      <MarketingNav section="HOW IT WORKS" />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 28px', position: 'relative', zIndex: 1 }}>

        {/* Hero */}
        <section ref={hero.ref} style={{ padding: '96px 0 72px' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 20px' }}>HOW IR WORKS</p>
          <h1 style={{ fontSize: 'clamp(34px, 5.5vw, 64px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.08, margin: '0 0 20px', fontFamily: sans }}>
            <CountUp to={30} suffix=",000+ open notices in." started={hero.inView} duration={1200} /><br />
            <span style={{ color: crimson }}>5 worth your time out.</span>
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.8, color: 'rgba(255,255,255,0.45)', maxWidth: 640, margin: 0, fontFamily: sans }}>
            SAM.gov is a firehose built for compliance, not for finding work. IR sits between you and
            the firehose: it ingests the market, scores every notice against your company, and delivers
            only what you can actually win.
          </p>
        </section>

        {/* Funnel */}
        <section style={{ padding: '48px 0 72px' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 14px' }}>THE SIGNAL PATH</p>
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 40px', fontFamily: sans }}>
            From firehose to shortlist.
          </h2>
          <SignalFunnel />
        </section>

        {/* Scoring */}
        <section style={{ padding: '72px 0' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 14px' }}>THE SCORING FORMULA</p>
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px', fontFamily: sans }}>
            100 points. <span style={{ color: crimson }}>Zero black box.</span>
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: '0 0 44px', maxWidth: 620, fontFamily: sans, lineHeight: 1.7 }}>
            Every contract's score decomposes into four visible factors, and every contract page shows the
            full analysis: what you have, what the notice demands, where they align, and what each gap
            costs in points. If IR says 85, you can read exactly why it says 85 — and what would make it a 100.
            Agencies you've worked with before also rank ahead on near-ties.
          </p>
          <ScoringBar />
        </section>

        {/* Timeline */}
        <section style={{ padding: '72px 0' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 14px' }}>WHILE YOU SLEEP</p>
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 40px', fontFamily: sans }}>
            The system runs itself.
          </h2>
          <DayTimeline />
        </section>

        {/* From match to submission */}
        <section style={{ padding: '72px 0' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 14px' }}>THEN WHAT</p>
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 20px', fontFamily: sans }}>
            A match is only step one.
          </h2>
          <p style={{ fontSize: 15, lineHeight: 1.9, color: 'rgba(255,255,255,0.45)', maxWidth: 680, margin: 0, fontFamily: sans }}>
            Save a match and it enters your <strong style={{ color: '#fff' }}>pipeline</strong> — tracked from pursuing to
            submitted to won, with dollar totals. When you decide to bid, the <strong style={{ color: '#fff' }}>proposal engine</strong>{' '}
            walks you through a guided questionnaire and produces a formatted 4-volume federal
            proposal: technical, management, past performance, and price. One more click generates your
            capability statement. And when it&apos;s ready, IR sends it to the <strong style={{ color: '#fff' }}>contracting
            officer on the notice</strong> — with replies routed to your inbox.{' '}
            <a href="/capabilities" style={{ color: crimson, fontWeight: 600 }}>See the full capability breakdown →</a>
          </p>
        </section>

        <MarketingCta headline="Watch it score your first contract." sub="Paste your UEI. Profile builds itself. Matches in 5 minutes." />
      </div>
    </div>
  )
}
