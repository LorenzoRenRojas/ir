'use client'

import { useState } from 'react'
import Link from 'next/link'
import MetatronBackdrop from '@/components/MetatronBackdrop'
import { useInView, CountUp, MarketingNav, MarketingCta, mono, sans, crimson, surface } from '@/components/marketing'

const PLANS = [
  {
    name: 'STARTER', price: 79, tier: 'starter', popular: false,
    tagline: 'Your first federal contracts.',
    features: ['25 contract matches / month', 'Daily match digest email', 'Deadline alerts (3 days + 24h)', 'Capability statement generator', 'Bid pipeline with $ totals'],
  },
  {
    name: 'PRO', price: 199, tier: 'pro', popular: true,
    tagline: 'The full intelligence loop.',
    features: ['Unlimited contract matches', 'Recompete Radar — 18-month expiring-contract intel', 'Full proposal engine (4-volume drafts)', 'Send proposals to the contracting officer', 'Win probability + incumbent detection'],
  },
  {
    name: 'ENTERPRISE', price: 499, tier: 'enterprise', popular: false,
    tagline: 'Your whole capture team, on one terminal.',
    features: ['Everything in Pro', '5 team seats + shared pipeline', 'Proposal sharing across your org', 'White-label documents', 'Dedicated account manager'],
  },
]

// Upmarket expansion — the ladder that scales with the customer. Marked
// "coming soon": architecture visible now, tiers light up as the product earns
// them. Keeps the small-business wedge above while signalling where IR grows.
const EXPANSION = [
  {
    name: 'TEAM', tag: 'Per seat',
    tagline: 'Your whole capture shop on one pipeline.',
    features: ['Per-seat pricing that scales with your team', 'Shared pipeline + assignments', 'Role permissions (watchlist, proposals, billing)'],
  },
  {
    name: 'AI PROPOSAL STUDIO', tag: 'Module',
    tagline: 'AI-drafted narratives, reviewer sign-off, one-click send.',
    features: ['Claude-drafted 4-volume proposals', 'Route drafts to a reviewer before they go out', 'Send to the contracting officer from IR'],
  },
  {
    name: 'COMPLIANCE', tag: 'Module',
    tagline: 'CMMC / NIST 800-171 readiness, guided.',
    features: ['Plain-English self-assessment wizard', 'SSP + POA&M document generation', 'SPRS-ready scoring & audit prep'],
  },
  {
    name: 'PRIME', tag: 'Enterprise',
    tagline: 'Supplier-base intelligence for primes.',
    features: ['Flow-down compliance visibility', 'Teaming & subcontractor discovery', 'Dedicated success + custom terms'],
  },
]

function ExpansionTiers() {
  const { ref, inView } = useInView<HTMLDivElement>(0.15)
  return (
    <div ref={ref} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
      {EXPANSION.map((tier, i) => (
        <div
          key={tier.name}
          style={{
            position: 'relative', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.14)',
            padding: '30px 26px',
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(20px)',
            transition: `all 0.55s cubic-bezier(0.22,1,0.36,1) ${i * 120}ms`,
          }}
        >
          <div style={{ position: 'absolute', top: 16, right: 16, fontFamily: mono, fontSize: 8, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.18)', padding: '3px 8px' }}>
            COMING SOON
          </div>
          <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: crimson, marginBottom: 6 }}>{tier.name}</div>
          <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', marginBottom: 18 }}>{tier.tag.toUpperCase()}</div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 20px', fontFamily: sans, lineHeight: 1.5 }}>{tier.tagline}</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 11 }}>
            {tier.features.map((f) => (
              <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12.5, color: 'rgba(255,255,255,0.4)', fontFamily: sans, lineHeight: 1.5 }}>
                <span style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0, marginTop: 1 }}>—</span>{f}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

// 3-year total cost of ownership (legacy figures: typical reported pricing; estimates)
const TCO = [
  { name: 'GOVWIN IQ', total: 36000, ir: false },
  { name: 'GOVTRIBE', total: 13500, ir: false },
  { name: 'HIGHERGOV', total: 10500, ir: false },
  { name: 'IR PRO', total: 7164, ir: true },
  { name: 'IR STARTER', total: 2844, ir: true },
]
const TCO_MAX = 36000

function PlanCards() {
  const { ref, inView } = useInView<HTMLDivElement>(0.2)
  return (
    <div ref={ref} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
      {PLANS.map((plan, i) => (
        <div
          key={plan.tier}
          style={{
            position: 'relative',
            background: '#111',
            border: plan.popular ? `1px solid ${crimson}` : '1px solid rgba(255,255,255,0.09)',
            padding: '40px 36px',
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(24px)',
            transition: `all 0.6s cubic-bezier(0.22,1,0.36,1) ${i * 160}ms`,
          }}
        >
          {plan.popular && (
            <div style={{ position: 'absolute', top: -1, left: -1, right: -1, height: 3, background: crimson }} />
          )}
          {plan.popular && (
            <div style={{ position: 'absolute', top: 16, right: 16, fontFamily: mono, fontSize: 8, letterSpacing: '0.16em', color: crimson, border: `1px solid ${crimson}`, padding: '3px 8px' }}>
              MOST POPULAR
            </div>
          )}
          <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>{plan.name}</div>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 52, fontWeight: 800, letterSpacing: '-0.04em', color: '#fff', fontFamily: sans }}>
              $<CountUp to={plan.price} started={inView} duration={1100} />
            </span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginLeft: 6, fontFamily: mono }}>/mo</span>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 28px', fontFamily: sans }}>{plan.tagline}</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 13 }}>
            {plan.features.map((f) => (
              <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: 'rgba(255,255,255,0.55)', fontFamily: sans, lineHeight: 1.5 }}>
                <span style={{ color: crimson, flexShrink: 0, fontWeight: 700, marginTop: 1 }}>—</span>{f}
              </li>
            ))}
          </ul>
          <Link
            href={plan.tier === 'enterprise' ? 'mailto:hello@ir-gov.app' : '/register'}
            style={{
              display: 'block', textAlign: 'center', padding: 14, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              fontFamily: mono, textDecoration: 'none',
              background: plan.popular ? crimson : 'transparent',
              color: plan.popular ? '#fff' : 'rgba(255,255,255,0.6)',
              border: plan.popular ? 'none' : '1px solid rgba(255,255,255,0.15)',
            }}
          >
            {plan.tier === 'enterprise' ? 'CONTACT →' : 'START FREE →'}
          </Link>
        </div>
      ))}
    </div>
  )
}

// One median-sized win vs a year of IR Pro — the ratio IS the argument
function RoiRatio() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3)
  return (
    <div ref={ref}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
          A TYPICAL SMALL-BUSINESS SET-ASIDE AWARD
        </div>
        <div style={{ position: 'relative', height: 44 }}>
          <div style={{ position: 'absolute', inset: '0 auto 0 0', width: inView ? '100%' : '0%', background: crimson, borderRadius: '0 4px 4px 0', transition: 'width 1.1s cubic-bezier(0.22,1,0.36,1)', display: 'flex', alignItems: 'center', paddingLeft: 16 }}>
            <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 800, color: '#fff' }}>$250,000</span>
          </div>
        </div>
      </div>
      <div>
        <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
          A FULL YEAR OF IR PRO
        </div>
        <div style={{ position: 'relative', height: 44 }}>
          <div style={{ position: 'absolute', inset: '0 auto 0 0', width: inView ? '0.96%' : '0%', minWidth: 4, background: 'rgba(255,255,255,0.5)', transition: 'width 1.1s cubic-bezier(0.22,1,0.36,1) 0.3s' }} />
          <span style={{ position: 'absolute', left: 'calc(0.96% + 12px)', top: '50%', transform: 'translateY(-50%)', fontFamily: mono, fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
            $2,388
          </span>
        </div>
      </div>
      <p style={{ fontFamily: sans, fontSize: 15, color: 'rgba(255,255,255,0.5)', marginTop: 36, lineHeight: 1.8, maxWidth: 620 }}>
        One award at that size pays for{' '}
        <strong style={{ color: '#fff', fontSize: 20 }}>
          <CountUp to={104} started={inView} duration={1600} /> years
        </strong>{' '}
        of IR Pro. The question isn&apos;t whether the tool is worth $199 a month — it&apos;s whether it
        helps you win <em>one</em> contract, <em>once</em>.
      </p>
    </div>
  )
}

function TcoChart() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3)
  const [hovered, setHovered] = useState<string | null>(null)
  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {TCO.map((bar, i) => {
        const pct = (bar.total / TCO_MAX) * 100
        return (
          <div
            key={bar.name}
            onMouseEnter={() => setHovered(bar.name)}
            onMouseLeave={() => setHovered(null)}
            style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 160px) 1fr', gap: 16, alignItems: 'center', cursor: 'default' }}
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
                  filter: hovered === bar.name ? 'brightness(1.35)' : 'none',
                }}
              />
              <span style={{ position: 'absolute', left: `calc(${inView ? pct : 0}% + 10px)`, top: '50%', transform: 'translateY(-50%)', fontFamily: mono, fontSize: 11, fontWeight: 700, color: bar.ir ? '#fff' : 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', transition: `left 0.9s cubic-bezier(0.22,1,0.36,1) ${i * 110}ms` }}>
                ${bar.total.toLocaleString()}
              </span>
            </div>
          </div>
        )
      })}
      <p style={{ fontFamily: sans, fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 12, lineHeight: 1.6 }}>
        Three-year total. Legacy figures based on typical reported annual pricing for sales-quoted products; estimates as of 2026.
      </p>
    </div>
  )
}

const FAQS = [
  { q: 'Is there a free tier?', a: 'Yes — sign up free, build your profile, and preview your matches before paying anything.' },
  { q: 'Do I need a sales call?', a: 'No. Self-serve signup, and your SAM.gov UEI auto-fills your profile in about 40 seconds.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Month to month, no contracts, no cancellation calls.' },
  { q: 'Where does the data come from?', a: 'Live from official U.S. government sources: SAM.gov for solicitations and USAspending.gov for award and expiration intelligence.' },
]

function Faq() {
  const { ref, inView } = useInView<HTMLDivElement>(0.2)
  return (
    <div ref={ref} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
      {FAQS.map((f, i) => (
        <div key={f.q} style={{ border: '1px solid rgba(255,255,255,0.09)', background: '#111', padding: '24px 26px', opacity: inView ? 1 : 0, transition: `opacity 0.5s ease ${i * 120}ms` }}>
          <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#fff', marginBottom: 10 }}>{f.q}</div>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.45)', margin: 0, fontFamily: sans }}>{f.a}</p>
        </div>
      ))}
    </div>
  )
}

export default function PricingClient() {
  return (
    <div style={{ minHeight: '100vh', background: surface, color: '#fff', fontFamily: mono }}>
      <MetatronBackdrop />
      <MarketingNav section="PRICING" />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 28px', position: 'relative', zIndex: 1 }}>

        {/* Hero */}
        <section style={{ padding: '96px 0 64px' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 20px' }}>ACCESS TIERS</p>
          <h1 style={{ fontSize: 'clamp(34px, 5.5vw, 64px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.08, margin: '0 0 20px', fontFamily: sans }}>
            Priced like software.<br /><span style={{ color: crimson }}>Not like a consultancy.</span>
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.8, color: 'rgba(255,255,255,0.45)', maxWidth: 620, margin: 0, fontFamily: sans }}>
            Legacy GovCon intelligence starts at four figures a year and a sales call. IR starts free —
            and every tier does more than the tools priced above it, because the intelligence is
            automated, not staffed.
          </p>
        </section>

        {/* Plans */}
        <section style={{ padding: '24px 0 48px' }}>
          <PlanCards />
        </section>

        {/* Expansion tiers — coming soon */}
        <section style={{ padding: '0 0 72px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
            <p style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: 0 }}>GROWING WITH YOU</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0, fontFamily: sans }}>
              As your shop grows, IR grows with it. These tiers are in active development — early members help shape them.
            </p>
          </div>
          <ExpansionTiers />
        </section>

        {/* ROI */}
        <section style={{ padding: '72px 0' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 14px' }}>THE MATH</p>
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 40px', fontFamily: sans }}>
            One win. <span style={{ color: crimson }}>A century of subscription.</span>
          </h2>
          <RoiRatio />
        </section>

        {/* TCO */}
        <section style={{ padding: '72px 0' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 14px' }}>3-YEAR COST OF OWNERSHIP</p>
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 40px', fontFamily: sans }}>
            What three years actually costs.
          </h2>
          <TcoChart />
        </section>

        {/* FAQ */}
        <section style={{ padding: '72px 0' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', margin: '0 0 14px' }}>QUESTIONS</p>
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 40px', fontFamily: sans }}>
            The short answers.
          </h2>
          <Faq />
        </section>

        <MarketingCta headline="Start free. Upgrade when it earns it." sub="No sales call. No contract. Cancel anytime." />
      </div>
    </div>
  )
}
