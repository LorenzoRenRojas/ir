import Link from 'next/link'

const PRICING_PLANS = [
  {
    name: 'STARTER',
    price: 79,
    features: ['25 contract matches/month', '3 document templates', 'Basic match scoring', 'Email support', 'SAM.gov integration'],
    cta: 'Deploy',
    popular: false,
    tier: 'starter',
  },
  {
    name: 'PRO',
    price: 199,
    features: ['Unlimited contract matches', 'Full document suite', 'AI-drafted responses', 'Advanced match scoring', 'Priority support', 'Direct SAM.gov integration'],
    cta: 'Deploy',
    popular: true,
    tier: 'pro',
  },
  {
    name: 'ENTERPRISE',
    price: 499,
    features: ['Everything in Pro', '5 team seats', 'Teaming roundtable', 'White-label documents', 'Dedicated account manager', 'SLA guarantee'],
    cta: 'Contact',
    popular: false,
    tier: 'enterprise',
  },
]

const STATS = [
  { value: '24,629', label: 'ACTIVE OPPORTUNITIES', sublabel: 'updated daily from SAM.gov' },
  { value: '$847B', label: 'CONTRACT VALUE', sublabel: 'tracked annually' },
  { value: '100ms', label: 'MATCH LATENCY', sublabel: 'average scoring time' },
  { value: '94%', label: 'MATCH ACCURACY', sublabel: 'NAICS + set-aside scoring' },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'PROFILE INGESTION', desc: 'Input your NAICS codes, certifications, clearance levels, and past performance. Our system maps your capability matrix.' },
  { step: '02', title: 'SIGNAL PROCESSING', desc: 'Contracts are scored against your profile in real time. NAICS depth, set-aside eligibility, contract size, and geography weighted algorithmically.' },
  { step: '03', title: 'MATCH DELIVERY', desc: 'Ranked opportunities surface in your dashboard. Win probability, incumbent detection, and deadline alerts keep you ahead.' },
  { step: '04', title: 'DOCUMENT GENERATION', desc: 'Capability statements, letters of intent, and teaming agreements generated from your profile. Ready to submit.' },
]

export default function LandingPage() {
  return (
    <div style={{ background: '#0A0A0B', minHeight: '100vh', color: '#E2E8F0', fontFamily: 'var(--font-geist-mono, monospace)' }}>

      {/* Navbar */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,11,0.92)', backdropFilter: 'blur(8px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <span style={{ color: '#C8A96E', fontSize: 22, fontWeight: 700 }}>ᛁ</span>
            <span style={{ color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '0.12em' }}>IR</span>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, letterSpacing: '0.08em', marginLeft: 4 }}>GOVCON INTELLIGENCE</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <Link href="#how-it-works" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, letterSpacing: '0.1em', textDecoration: 'none' }}>HOW IT WORKS</Link>
            <Link href="#pricing" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, letterSpacing: '0.1em', textDecoration: 'none' }}>PRICING</Link>
            <Link href="/login" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, letterSpacing: '0.1em', textDecoration: 'none' }}>SIGN IN</Link>
            <Link href="/register" style={{ background: '#C8A96E', color: '#0A0A0B', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', padding: '8px 16px', textDecoration: 'none' }}>
              GET ACCESS →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 24px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80' }} />
          <span style={{ color: '#4ADE80', fontSize: 11, letterSpacing: '0.12em' }}>LIVE — SAM.GOV FEED ACTIVE</span>
        </div>

        <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 28, maxWidth: 800, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
          Government contracts<br />
          <span style={{ color: '#C8A96E' }}>matched to your company.</span><br />
          Not the other way around.
        </h1>

        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 16, lineHeight: 1.7, maxWidth: 520, marginBottom: 40, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
          IR scores every federal opportunity against your capability profile — NAICS depth, set-aside eligibility, contract size, geography. Your match score in under 100ms.
        </p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" style={{ background: '#C8A96E', color: '#0A0A0B', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }}>
            START MATCHING →
          </Link>
          <Link href="#how-it-works" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, letterSpacing: '0.08em', textDecoration: 'none', padding: '14px 0' }}>
            SEE HOW IT WORKS
          </Link>
        </div>
      </section>

      {/* Stats bar */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ padding: '32px 24px', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
              <div style={{ color: '#C8A96E', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>{s.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, letterSpacing: '0.12em', marginTop: 6 }}>{s.label}</div>
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, marginTop: 2 }}>{s.sublabel}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 24px' }}>
        <div style={{ marginBottom: 56 }}>
          <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, letterSpacing: '0.16em', marginBottom: 16 }}>SYSTEM ARCHITECTURE</div>
          <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>How IR works</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, background: 'rgba(255,255,255,0.07)' }}>
          {HOW_IT_WORKS.map((item) => (
            <div key={item.step} style={{ background: '#0A0A0B', padding: '40px 36px' }}>
              <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11, letterSpacing: '0.12em', marginBottom: 16 }}>{item.step}</div>
              <h3 style={{ color: '#C8A96E', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 14 }}>{item.title}</h3>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.7, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 24px' }}>
          <div style={{ marginBottom: 56 }}>
            <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, letterSpacing: '0.16em', marginBottom: 16 }}>ACCESS TIERS</div>
            <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>Pricing</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(255,255,255,0.07)' }}>
            {PRICING_PLANS.map((plan) => (
              <div key={plan.tier} style={{ background: plan.popular ? '#0F0F10' : '#0A0A0B', padding: '40px 32px', position: 'relative' }}>
                {plan.popular && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: '#C8A96E' }} />
                )}
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: '0.16em', marginBottom: 12 }}>{plan.name}</div>
                <div style={{ marginBottom: 32 }}>
                  <span style={{ fontSize: 40, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>${plan.price}</span>
                  <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, marginLeft: 6 }}>/mo</span>
                </div>
                <ul style={{ marginBottom: 36, listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: 'rgba(255,255,255,0.5)', fontSize: 13, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
                      <span style={{ color: '#C8A96E', flexShrink: 0, marginTop: 1 }}>—</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.tier === 'enterprise' ? 'mailto:hello@ir-gov.app' : '/register'}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '12px',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textDecoration: 'none',
                    background: plan.popular ? '#C8A96E' : 'transparent',
                    color: plan.popular ? '#0A0A0B' : 'rgba(255,255,255,0.5)',
                    border: plan.popular ? 'none' : '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  {plan.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '100px 24px', textAlign: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, letterSpacing: '0.16em', marginBottom: 24 }}>READY TO DEPLOY</div>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 16, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
          24,629 contracts.<br />
          <span style={{ color: '#C8A96E' }}>How many match your company?</span>
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, marginBottom: 36, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
          Profile takes 4 minutes. First matches in under 60 seconds.
        </p>
        <Link href="/register" style={{ background: '#C8A96E', color: '#0A0A0B', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', padding: '16px 32px', textDecoration: 'none', display: 'inline-block' }}>
          START FOR FREE →
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '48px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#C8A96E', fontSize: 20, fontWeight: 700 }}>ᛁ</span>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, letterSpacing: '0.1em' }}>IR GOVCON INTELLIGENCE</span>
          </div>
          <div style={{ display: 'flex', gap: 32 }}>
            <Link href="/login" style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, letterSpacing: '0.08em', textDecoration: 'none' }}>SIGN IN</Link>
            <Link href="/register" style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, letterSpacing: '0.08em', textDecoration: 'none' }}>REGISTER</Link>
            <Link href="mailto:hello@ir-gov.app" style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, letterSpacing: '0.08em', textDecoration: 'none' }}>CONTACT</Link>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10, letterSpacing: '0.06em' }}>
            © {new Date().getFullYear()} IR — DATA SOURCED FROM SAM.GOV
          </div>
        </div>
      </footer>
    </div>
  )
}
