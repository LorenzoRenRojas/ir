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

        {/* Price chart */}
        <section style={{ padding: '72px 0' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 14px' }}>ANNUAL COST</p>
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px', fontFamily: sans }}>
            The same intelligence. <span style={{ color: crimson }}>A fraction of the invoice.</span>
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: '0 0 44px', maxWidth: 560, fontFamily: sans, lineHeight: 1.7 }}>
            What a year of GovCon intelligence costs, tool by tool.
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
