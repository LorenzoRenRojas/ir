'use client'

import { useState } from 'react'
import Link from 'next/link'
import MetatronBackdrop from '@/components/MetatronBackdrop'
import MetatronEyeIcon from '@/components/MetatronEyeIcon'
import { useInView, CountUp, MarketingNav, mono, sans, crimson, surface } from '@/components/marketing'

// ─── Data ─────────────────────────────────────────────────────────────────────
const HERO_STATS = [
  { to: 755, prefix: '$', suffix: 'B', label: 'FEDERAL MARKET / YEAR' },
  { to: 3000, suffix: '+', label: 'CONTRACTS SCORED DAILY' },
  { to: 18, suffix: ' MO', label: 'RECOMPETE RADAR HORIZON' },
  { to: 5, suffix: ' MIN', label: 'SIGNUP TO FIRST MATCH' },
]

// Typical reported annual pricing for sales-quoted products; estimates.
const PRICE_BARS = [
  { name: 'GOVWIN IQ (DELTEK)', value: 12000, ir: false },
  { name: 'GOVTRIBE',           value: 4500,  ir: false },
  { name: 'HIGHERGOV',          value: 3500,  ir: false },
  { name: 'IR PRO',             value: 2388,  ir: true  },
  { name: 'EZGOVOPPS',          value: 2100,  ir: false },
  { name: 'IR STARTER',         value: 948,   ir: true  },
]
const PRICE_MAX = 12000

const LOOP_STEPS = [
  { n: '01', title: 'FIND',    body: 'Every active SAM.gov solicitation scored against your NAICS codes, set-asides, size, and geography.' },
  { n: '02', title: 'FORESEE', body: 'Recompete Radar surfaces contracts in your space expiring within 18 months — before the RFP exists.' },
  { n: '03', title: 'DECIDE',  body: 'A Capture Playbook on every contract — eligibility verdict, market concentration, who wins here, and a Bid/No-Bid scorecard so you spend hours only on winnable work.' },
  { n: '04', title: 'TRACK',   body: 'A bid pipeline from first look to award, with dollar totals and automatic deadline alerts. Every win and loss teaches your matching algorithm.' },
  { n: '05', title: 'DRAFT',   body: 'A guided questionnaire becomes a formatted 4-volume federal proposal. Capability statements in one click.' },
  { n: '06', title: 'SEND',    body: 'Proposal delivered to the contracting officer from inside IR — replies go to your inbox.' },
]

const MATRIX: { feature: string; ir: string; legacy: string; irHas: boolean; legacyHas: boolean }[] = [
  { feature: 'Profile-scored contract matching',      ir: 'Every posting, daily',        legacy: 'Keyword saved searches',      irHas: true,  legacyHas: true },
  { feature: 'Match reasoning shown per contract',    ir: 'Full analysis: you vs. the notice, factor by factor', legacy: 'Black box', irHas: true,  legacyHas: false },
  { feature: 'Expiring-contract (pre-RFP) intel',     ir: 'Automated, included',         legacy: 'Human analysts, $10k+ tier',  irHas: true,  legacyHas: true },
  { feature: 'Proposal drafting',                     ir: '4-volume guided drafts',      legacy: 'Not offered',                 irHas: true,  legacyHas: false },
  { feature: 'Capability statement generator',        ir: 'One click',                   legacy: 'Not offered',                 irHas: true,  legacyHas: false },
  { feature: 'Send to contracting officer',           ir: 'Built in, with confirmation', legacy: 'Look it up yourself',         irHas: true,  legacyHas: false },
  { feature: 'Bid pipeline with $ totals',            ir: 'Included',                    legacy: 'CRM add-on pricing',          irHas: true,  legacyHas: true },
  { feature: 'Self-serve signup',                     ir: '5 minutes, no sales call',    legacy: 'Demo → quote → contract',     irHas: true,  legacyHas: false },
]

// ─── Sections ─────────────────────────────────────────────────────────────────

function HeroStats() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3)
  return (
    <div ref={ref} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {HERO_STATS.map((s, i) => (
        <div key={s.label} style={{ background: surface, padding: '36px 28px', opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(16px)', transition: `all 0.6s cubic-bezier(0.22,1,0.36,1) ${i * 120}ms` }}>
          <div style={{ fontSize: 40, fontWeight: 800, color: crimson, letterSpacing: '-0.03em', fontFamily: sans }}>
            <CountUp to={s.to} prefix={s.prefix ?? ''} suffix={s.suffix ?? ''} started={inView} />
          </div>
          <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.35)', marginTop: 8 }}>{s.label}</div>
        </div>
      ))}
    </div>
  )
}

function CapabilityLoop() {
  const { ref, inView } = useInView<HTMLDivElement>(0.2)
  return (
    <div ref={ref} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
      {LOOP_STEPS.map((step, i) => (
        <div
          key={step.n}
          style={{
            border: '1px solid rgba(255,255,255,0.09)',
            background: '#111',
            padding: '28px 24px',
            position: 'relative',
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(20px)',
            transition: `all 0.55s cubic-bezier(0.22,1,0.36,1) ${i * 160}ms`,
          }}
        >
          <div
            style={{
              position: 'absolute', top: 0, left: 0, height: 2, background: crimson,
              width: inView ? '100%' : '0%',
              transition: `width 0.5s ease ${i * 160 + 250}ms`,
            }}
          />
          <div style={{ fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', marginBottom: 14 }}>{step.n}</div>
          <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', color: crimson, marginBottom: 12 }}>{step.title}</div>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.45)', margin: 0, fontFamily: sans }}>{step.body}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Recompete Radar: animated mock cards ─────────────────────────────────────
const RADAR_MOCK = [
  { score: 87, desc: 'Enterprise IT support services — multi-year vehicle winding down', inc: 'Incumbent Corp A', val: '$2.4M', ends: '~8 MO', color: '#16a34a' },
  { score: 74, desc: 'Cybersecurity operations center staffing', inc: 'Incumbent Corp B', val: '$890K', ends: '~5 MO', color: crimson },
  { score: 61, desc: 'Logistics & warehouse modernization program', inc: 'Incumbent Corp C', val: '$5.1M', ends: '~14 MO', color: crimson },
]

function RadarSection() {
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  return (
    <section ref={ref} style={{ padding: '72px 0' }}>
      <p style={{ fontSize: 10, letterSpacing: '0.18em', color: crimson, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}><MetatronEyeIcon size={22} /> RECOMPETE RADAR — LEGACY TOOLS CHARGE $10K+/YR FOR THIS</p>
      <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px', fontFamily: sans }}>
        The contracts that don&apos;t exist yet.
      </h2>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: '0 0 44px', maxWidth: 640, fontFamily: sans, lineHeight: 1.7 }}>
        Federal contracts expire on public, knowable dates — and most get recompeted. IR reads the
        government&apos;s own award data, finds everything in your NAICS codes ending within 18 months,
        names the incumbent and their price, and scores each opportunity on timing, size fit, agency
        history, and your learned preferences. You get an email the day something new hits your radar —
        6 to 18 months before the RFP exists.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 720 }}>
        {RADAR_MOCK.map((c, i) => (
          <div
            key={i}
            style={{
              background: '#111', border: '1px solid rgba(255,255,255,0.09)', borderLeft: `3px solid ${c.color}`,
              padding: '16px 20px',
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateX(0)' : 'translateX(-20px)',
              transition: `all 0.55s cubic-bezier(0.22,1,0.36,1) ${i * 180}ms`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: c.color }}>
                <CountUp to={c.score} started={inView} duration={900} />%
              </span>
              <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: inView ? `${c.score}%` : '0%', background: c.color, borderRadius: 2, transition: `width 0.9s cubic-bezier(0.22,1,0.36,1) ${i * 180 + 200}ms` }} />
              </div>
              <span style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>RECOMPETE SCORE</span>
            </div>
            <div style={{ color: '#fff', fontSize: 13.5, fontWeight: 600, marginBottom: 6, fontFamily: sans }}>{c.desc}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>INCUMBENT: {c.inc.toUpperCase()} · {c.val}</span>
              <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, color: c.color }}>EXPIRES {c.ends}</span>
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginTop: 20 }}>
        LEGACY EQUIVALENT: HUMAN ANALYST REPORTS AT $10,000+/YR. IR: INCLUDED IN PRO.
      </p>
    </section>
  )
}

// ─── AI Proposal Studio: the draft → review → send flow ───────────────────────
const PROPOSAL_FLOW = [
  {
    n: '01', title: 'ANSWER', tag: 'You',
    body: 'A guided questionnaire captures your approach, past performance, and pricing — the raw material, in your words.',
  },
  {
    n: '02', title: 'DRAFT', tag: 'AI',
    body: 'IR turns your answers into a compliant, formatted 4-volume federal proposal — technical, management, past performance, and price narratives written for you to refine, not from scratch.',
  },
  {
    n: '03', title: 'REVIEW', tag: 'Optional',
    body: 'Route the draft to a reviewer you choose — a teammate, a capture consultant, or your attorney — for sign-off before anything leaves your hands. Nothing is ever sent without your approval.',
  },
  {
    n: '04', title: 'SEND', tag: 'One click',
    body: 'Deliver the finished proposal to the contracting officer on the SAM.gov notice, directly from IR. Replies route to your inbox.',
  },
]

function ProposalStudio() {
  const { ref, inView } = useInView<HTMLDivElement>(0.2)
  return (
    <section ref={ref} style={{ padding: '72px 0' }}>
      <p style={{ fontSize: 10, letterSpacing: '0.18em', color: crimson, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        AI PROPOSAL STUDIO
        <span style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.25)', padding: '3px 8px' }}>IN DEVELOPMENT</span>
      </p>
      <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px', fontFamily: sans }}>
        From a blank page to the contracting officer.
      </h2>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: '0 0 44px', maxWidth: 660, fontFamily: sans, lineHeight: 1.7 }}>
        The proposal is where most small businesses stall — the work is real, the deadline is close, and
        a blank Word document is intimidating. IR&apos;s Proposal Studio turns your answers into a compliant
        first draft, lets a reviewer you trust sign off, and sends it to the contracting officer without you
        ever leaving the platform. You stay in control at every step.
      </p>

      {/* Flow rail */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 28 }}>
        {PROPOSAL_FLOW.map((step, i) => (
          <div
            key={step.n}
            style={{
              position: 'relative', border: '1px solid rgba(255,255,255,0.09)', background: '#111', padding: '26px 22px',
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateY(0)' : 'translateY(20px)',
              transition: `all 0.55s cubic-bezier(0.22,1,0.36,1) ${i * 150}ms`,
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, height: 2, background: crimson, width: inView ? '100%' : '0%', transition: `width 0.5s ease ${i * 150 + 250}ms` }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>{step.n}</span>
              <span style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.14)', padding: '2px 7px' }}>{step.tag.toUpperCase()}</span>
            </div>
            <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', color: crimson, marginBottom: 12 }}>{step.title}</div>
            <p style={{ fontSize: 12.5, lineHeight: 1.7, color: 'rgba(255,255,255,0.45)', margin: 0, fontFamily: sans }}>{step.body}</p>
          </div>
        ))}
      </div>

      <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.3)', margin: 0, lineHeight: 1.7, maxWidth: 660 }}>
        NOTE: IR DRAFTS AND FORMATS — IT DOES NOT PROVIDE LEGAL REVIEW OR GUARANTEE AWARD. THE REVIEW STEP
        ROUTES YOUR DRAFT TO A PERSON YOU CHOOSE; NOTHING IS SENT WITHOUT YOUR SIGN-OFF.
      </p>
    </section>
  )
}

// ─── The honest win-odds math ─────────────────────────────────────────────────
// Federal contracting is a numbers game: P(win ≥1 in a year) = 1 - (1-p)^n,
// where p = per-bid win rate and n = well-fit bids submitted. A tool moves n
// (and, secondarily, p). We show our work — inputs, formula, and caveats —
// because a defensible model beats an inflated claim (marketing-claims policy).
const WIN_P = 0.10        // conservative per-bid win rate on a well-fit opportunity
const WIN_N_WITHOUT = 4   // well-fit bids/yr without a discovery + drafting tool
const WIN_N_WITH = 12     // well-fit bids/yr with IR
const oddsPct = (n: number) => Math.round((1 - Math.pow(1 - WIN_P, n)) * 100)

function WinOdds() {
  const { ref, inView } = useInView<HTMLDivElement>(0.2)
  const without = oddsPct(WIN_N_WITHOUT)   // 34
  const withIr = oddsPct(WIN_N_WITH)       // 72
  const mult = (withIr / without).toFixed(1)

  const assumptions = [
    { k: 'p — win rate per well-fit bid', v: '~10%', why: 'Conservative mid-range for a small business on a well-matched federal opportunity. Tight set-asides run higher; wide-open competitions run lower.' },
    { k: 'n — well-fit bids / year WITHOUT a tool', v: '≈ 4', why: 'Manual SAM.gov searching is slow, good opportunities get missed, and writing each proposal from scratch is the real bottleneck — so most small shops submit only a handful of real bids a year.' },
    { k: 'n — well-fit bids / year WITH IR', v: '≈ 12', why: 'Scored matching surfaces ~3× more genuinely winnable work, the eligibility filter kills wasted effort, Recompete Radar adds a pre-RFP pipeline, and proposal drafting removes the writing bottleneck.' },
  ]

  return (
    <section ref={ref} style={{ padding: '72px 0' }}>
      <p style={{ fontSize: 10, letterSpacing: '0.18em', color: crimson, margin: '0 0 14px', fontFamily: mono }}>THE HONEST MATH</p>
      <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px', fontFamily: sans }}>
        How much does IR actually move your odds?
      </h2>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: '0 0 40px', maxWidth: 680, fontFamily: sans, lineHeight: 1.7 }}>
        We&apos;ll show our work. Winning federal contracts comes down to two levers: how many
        genuinely winnable bids you get in front of, and how many you can actually submit. IR moves
        both — so here&apos;s the honest arithmetic, inputs and caveats included.
      </p>

      {/* The two outcomes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 28 }}>
        <div style={{ background: surface, padding: '36px 32px' }}>
          <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>WITHOUT A TOOL — ODDS OF A WIN THIS YEAR</div>
          <div style={{ fontSize: 52, fontWeight: 800, color: 'rgba(255,255,255,0.4)', fontFamily: sans, letterSpacing: '-0.03em', lineHeight: 1 }}>
            <CountUp to={without} suffix="%" started={inView} duration={900} />
          </div>
          <div style={{ fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 12 }}>≈ 4 well-fit bids · 10% each</div>
        </div>
        <div style={{ background: surface, padding: '36px 32px', position: 'relative' }}>
          <span style={{ position: 'absolute', top: 0, left: 0, width: 40, height: 3, background: crimson }} />
          <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', color: crimson, marginBottom: 14 }}>WITH IR — ODDS OF A WIN THIS YEAR</div>
          <div style={{ fontSize: 52, fontWeight: 800, color: '#fff', fontFamily: sans, letterSpacing: '-0.03em', lineHeight: 1 }}>
            <CountUp to={withIr} suffix="%" started={inView} duration={900} />
          </div>
          <div style={{ fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 12 }}>≈ 12 well-fit bids · 10% each</div>
        </div>
      </div>

      <p style={{ fontSize: 'clamp(18px, 2.4vw, 26px)', fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 40px', fontFamily: sans, color: '#fff' }}>
        Roughly <span style={{ color: crimson }}>{mult}× more likely</span> to win at least one contract this year — driven mainly by submitting ~3× more winnable bids.
      </p>

      {/* Show the work */}
      <div style={{ border: '1px solid rgba(255,255,255,0.09)', background: '#111', padding: '28px 28px', marginBottom: 20 }}>
        <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)', marginBottom: 18 }}>HOW WE GOT THERE</div>
        <div style={{ fontFamily: mono, fontSize: 15, color: '#fff', marginBottom: 24, letterSpacing: '0.02em' }}>
          P(win ≥ 1 this year) = 1 − (1 − <span style={{ color: crimson }}>p</span>)<sup style={{ color: crimson }}>n</sup>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {assumptions.map((a) => (
            <div key={a.k} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'baseline', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 16 }}>
              <div>
                <div style={{ fontFamily: mono, fontSize: 12, color: '#fff', marginBottom: 6, letterSpacing: '0.02em' }}>{a.k}</div>
                <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', fontFamily: sans, lineHeight: 1.6 }}>{a.why}</div>
              </div>
              <div style={{ fontFamily: sans, fontSize: 20, fontWeight: 800, color: crimson, whiteSpace: 'nowrap' }}>{a.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Brutal honesty */}
      <div style={{ border: '1px solid rgba(196,18,48,0.3)', background: 'rgba(196,18,48,0.05)', padding: '22px 26px' }}>
        <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.14em', color: crimson, marginBottom: 12 }}>WHERE THIS BREAKS — READ IT</div>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: sans, lineHeight: 1.65 }}>This is a model, not a guarantee. IR does not write your past performance, set your price, or promise an award.</li>
          <li style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: sans, lineHeight: 1.65 }}>It lives or dies on one thing: you actually bidding. We remove the friction — you still pull the trigger.</li>
          <li style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: sans, lineHeight: 1.65 }}>We used conservative inputs. Your real numbers move with your NAICS competition, set-aside status, and capacity to deliver. Better targeting and earlier positioning push the odds higher than the flat 10% we assumed.</li>
        </ul>
      </div>
    </section>
  )
}

function PriceChart() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3)
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div ref={ref}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {PRICE_BARS.map((bar, i) => {
          const pct = (bar.value / PRICE_MAX) * 100
          const isHover = hovered === bar.name
          return (
            <div
              key={bar.name}
              onMouseEnter={() => setHovered(bar.name)}
              onMouseLeave={() => setHovered(null)}
              style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 180px) 1fr', gap: 16, alignItems: 'center', cursor: 'default' }}
            >
              <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.1em', color: bar.ir ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: bar.ir ? 700 : 400, textAlign: 'right' }}>
                {bar.name}
              </div>
              <div style={{ position: 'relative', height: 26 }}>
                <div
                  style={{
                    position: 'absolute', inset: '4px auto 4px 0',
                    width: inView ? `${pct}%` : '0%',
                    minWidth: 3,
                    background: bar.ir ? crimson : 'rgba(255,255,255,0.16)',
                    borderRadius: '0 4px 4px 0',
                    transition: `width 0.9s cubic-bezier(0.22,1,0.36,1) ${i * 110}ms, filter 0.15s ease`,
                    filter: isHover ? 'brightness(1.35)' : 'none',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    left: `calc(${inView ? pct : 0}% + 10px)`,
                    top: '50%', transform: 'translateY(-50%)',
                    fontFamily: mono, fontSize: 11, fontWeight: 700,
                    color: bar.ir ? '#fff' : 'rgba(255,255,255,0.45)',
                    whiteSpace: 'nowrap',
                    transition: `left 0.9s cubic-bezier(0.22,1,0.36,1) ${i * 110}ms`,
                  }}
                >
                  ${bar.value.toLocaleString()}/yr
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <p style={{ fontFamily: sans, fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 24, lineHeight: 1.6 }}>
        Legacy pricing: typical reported annual cost for sales-quoted products; estimates as of 2026.
        IR Pro includes proposal drafting and Recompete Radar — capabilities legacy tools price into
        $10k+ tiers or don&apos;t offer at all.
      </p>
    </div>
  )
}

function Matrix() {
  const { ref, inView } = useInView<HTMLDivElement>(0.15)
  return (
    <div ref={ref} style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '16px 20px', fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>CAPABILITY</th>
            <th style={{ textAlign: 'left', padding: '16px 20px', fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', color: crimson, borderBottom: `1px solid ${crimson}`, width: '30%' }}>IR</th>
            <th style={{ textAlign: 'left', padding: '16px 20px', fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.35)', borderBottom: '1px solid rgba(255,255,255,0.1)', width: '30%' }}>LEGACY TOOLS</th>
          </tr>
        </thead>
        <tbody>
          {MATRIX.map((row, i) => (
            <tr key={row.feature} style={{ opacity: inView ? 1 : 0, transition: `opacity 0.4s ease ${i * 80}ms` }}>
              <td style={{ padding: '14px 20px', fontSize: 13, color: 'rgba(255,255,255,0.6)', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: sans }}>{row.feature}</td>
              <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 600, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: sans }}>
                <span style={{ color: '#4ADE80', marginRight: 8, fontFamily: mono }}>{row.irHas ? '✓' : '—'}</span>{row.ir}
              </td>
              <td style={{ padding: '14px 20px', fontSize: 13, color: 'rgba(255,255,255,0.35)', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: sans }}>
                <span style={{ color: row.legacyHas ? 'rgba(255,255,255,0.35)' : crimson, marginRight: 8, fontFamily: mono }}>{row.legacyHas ? '~' : '✗'}</span>{row.legacy}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TimeToValue() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3)
  return (
    <div ref={ref} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ background: surface, padding: '44px 36px', opacity: inView ? 1 : 0, transition: 'opacity 0.6s ease' }}>
        <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>LEGACY TOOLS — SIGNUP TO FIRST VALUE</div>
        <div style={{ fontSize: 44, fontWeight: 800, color: 'rgba(255,255,255,0.35)', fontFamily: sans, letterSpacing: '-0.03em' }}>2–6 weeks</div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontFamily: sans, lineHeight: 1.7, margin: '14px 0 0' }}>
          Demo call → pricing negotiation → contract → onboarding sessions → analyst setup.
        </p>
      </div>
      <div style={{ background: surface, padding: '44px 36px', opacity: inView ? 1 : 0, transition: 'opacity 0.6s ease 200ms' }}>
        <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', color: crimson, marginBottom: 16 }}>IR — SIGNUP TO FIRST MATCH</div>
        <div style={{ fontSize: 44, fontWeight: 800, color: '#fff', fontFamily: sans, letterSpacing: '-0.03em' }}>
          <CountUp to={5} suffix=" minutes" started={inView} duration={900} />
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontFamily: sans, lineHeight: 1.7, margin: '14px 0 0' }}>
          Paste your UEI → we pull your official SAM.gov registration → matches scored immediately.
        </p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CapabilitiesClient() {
  return (
    <div style={{ minHeight: '100vh', background: surface, color: '#fff', fontFamily: mono }}>
      <MetatronBackdrop pulse />
      <MarketingNav section="CAPABILITIES" />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 28px', position: 'relative', zIndex: 1 }}>

        {/* Hero */}
        <section style={{ padding: '96px 0 72px' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 20px' }}>CAPABILITIES</p>
          <h1 style={{ fontSize: 'clamp(34px, 5.5vw, 64px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.08, margin: '0 0 20px', fontFamily: sans }}>
            One terminal.<br /><span style={{ color: crimson }}>The whole federal market.</span>
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.8, color: 'rgba(255,255,255,0.45)', maxWidth: 640, margin: '0 0 56px', fontFamily: sans }}>
            IR compresses what legacy GovCon platforms spread across analyst teams, add-on modules,
            and five-figure contracts into one system your whole company can use on day one.
          </p>
          <HeroStats />
        </section>

        {/* The loop */}
        <section style={{ padding: '72px 0' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 14px' }}>THE LOOP</p>
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 40px', fontFamily: sans }}>
            Find → Foresee → Track → Draft → Send.
          </h2>
          <CapabilityLoop />
        </section>

        {/* Recompete Radar — the price-tier differentiator */}
        <RadarSection />

        {/* AI Proposal Studio — the draft → review → send flow */}
        <ProposalStudio />

        {/* The honest win-odds math */}
        <WinOdds />

        {/* Price chart */}
        <section style={{ padding: '72px 0' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 14px' }}>WHY WE COST LESS</p>
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px', fontFamily: sans }}>
            Built better, so it costs less. <span style={{ color: crimson }}>Not the other way around.</span>
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: '0 0 44px', maxWidth: 600, fontFamily: sans, lineHeight: 1.7 }}>
            Legacy platforms price in analyst desks, sales teams, and annual lock-in. We automated the
            intelligence and skipped the sales call — so the same market coverage costs a fraction, and
            every dollar you don&apos;t hand a vendor is capital back in your business.
          </p>
          <PriceChart />
        </section>

        {/* Time to value */}
        <section style={{ padding: '72px 0' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 14px' }}>TIME TO VALUE</p>
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 40px', fontFamily: sans }}>
            No demo. No quote. No waiting.
          </h2>
          <TimeToValue />
        </section>

        {/* Matrix */}
        <section style={{ padding: '72px 0' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 14px' }}>CAPABILITY MATRIX</p>
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 40px', fontFamily: sans }}>
            Feature for feature.
          </h2>
          <Matrix />
        </section>

        {/* CTA */}
        <section style={{ padding: '72px 0 120px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 16px', fontFamily: sans }}>
            See your matches in 5 minutes.
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', margin: '0 0 40px', fontFamily: sans }}>
            Free to start. No sales call. Your UEI does the paperwork.
          </p>
          <Link href="/register" style={{ display: 'inline-block', padding: '16px 40px', background: crimson, color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textDecoration: 'none' }}>
            START FREE →
          </Link>
        </section>
      </div>
    </div>
  )
}
