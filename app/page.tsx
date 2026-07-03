import Link from 'next/link'
import HeroMetatron from '@/components/HeroMetatron'

// ─── Metatron's Cube geometry (pre-computed) ───────────────────────────────
const C = 250
const R = 80

function polar(angleDeg: number, dist: number): [number, number] {
  const rad = (angleDeg - 90) * Math.PI / 180
  return [
    parseFloat((C + dist * Math.cos(rad)).toFixed(1)),
    parseFloat((C + dist * Math.sin(rad)).toFixed(1)),
  ]
}

const INNER_PTS: [number, number][] = [0, 60, 120, 180, 240, 300].map(a => polar(a, R))
const OUTER_PTS: [number, number][] = [0, 60, 120, 180, 240, 300].map(a => polar(a, R * 2))
const ALL_PTS: [number, number][] = [[C, C], ...INNER_PTS, ...OUTER_PTS]

// All 78 Metatron connecting lines
const METATRON_LINES = ALL_PTS.flatMap((p, i) =>
  ALL_PTS.slice(i + 1).map(q => ({ x1: p[0], y1: p[1], x2: q[0], y2: q[1] }))
)

// ─── Content ───────────────────────────────────────────────────────────────
const STATS = [
  { value: '$755B',  label: 'ANNUAL MARKET',      sub: 'U.S. federal procurement, FY2025' },
  { value: '261K+',  label: 'ACTIVE NOTICES',     sub: 'live solicitations on SAM.gov' },
  { value: '400+',   label: 'FEDERAL AGENCIES',   sub: 'posting opportunities across all branches' },
  { value: '5',      label: 'WIN FACTORS SCORED', sub: 'per opportunity, per company profile' },
]

const HOW = [
  { n: '01', title: 'PROFILE INGESTION',   body: 'Input your NAICS codes, certifications, clearance levels, and past performance once. We map your full capability matrix against every open solicitation in the federal database.' },
  { n: '02', title: 'SIGNAL PROCESSING',   body: 'Every contract scored against your profile in real time. NAICS depth, set-aside eligibility, contract size, and geography — weighted algorithmically to surface only what you can win.' },
  { n: '03', title: 'MATCH DELIVERY',      body: 'Ranked opportunities in your dashboard, plus a daily email the morning new matches post. Win probability, incumbent detection, and automatic deadline alerts at 3 days and 24 hours.' },
  { n: '04', title: 'PROPOSAL ENGINE',     body: 'A guided questionnaire turns your answers into a formatted 4-volume federal proposal — technical, management, past performance, and price. Generate capability statements in one click. Send straight to the contracting officer.' },
]

// Head-to-head vs the incumbents
const COMPARE = [
  { dim: 'PRICE',              them: '$5,000–$15,000 / year',       ir: 'From $79 / month' },
  { dim: 'GETTING STARTED',    them: 'Sales call, demo, contract',   ir: 'Self-serve — matching in 5 minutes' },
  { dim: 'PROPOSAL HELP',      them: 'None — intel only',            ir: 'Full proposal drafts + capability statements' },
  { dim: 'ALERTS',             them: 'Saved searches',               ir: 'Profile-scored daily digest + deadline reminders' },
  { dim: 'PRE-RFP INTEL',      them: 'Human analyst reports at $10k+', ir: 'Recompete Radar — expiring contracts, automated' },
  { dim: 'CONTRACTING OFFICER',them: 'Look it up yourself',          ir: 'One click — proposal sent, replies to your inbox' },
]

const PLANS = [
  { name: 'STARTER',    price: 79,  tier: 'starter',    popular: false, features: ['25 contract matches/month', 'Daily match digest email', 'Deadline alerts', 'Capability statement generator', 'Bid pipeline tracker'] },
  { name: 'PRO',        price: 199, tier: 'pro',        popular: true,  features: ['Unlimited contract matches', 'Recompete Radar — expiring-contract intel', 'Full proposal engine (4-volume drafts)', 'Send-to-contracting-officer', 'Win probability + incumbent intel'] },
  { name: 'ENTERPRISE', price: 499, tier: 'enterprise', popular: false, features: ['Everything in Pro', '5 team seats + shared pipeline', 'Proposal sharing across your org', 'White-label documents', 'Dedicated account manager'] },
]

// ─── Page ──────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const mono    = 'var(--font-geist-mono, monospace)'
  const sans    = 'var(--font-geist-sans, sans-serif)'
  const crimson = '#C41230'

  return (
    <div style={{ background: '#fff', minHeight: '100vh', color: '#0A0A0A', fontFamily: sans }}>

      {/* ── NAVBAR ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <span style={{ color: crimson, fontSize: 22, fontWeight: 700 }}>ᛁ</span>
            <span style={{ color: '#0A0A0A', fontSize: 15, fontWeight: 800, letterSpacing: '0.1em' }}>IR</span>
            <span style={{ color: 'rgba(0,0,0,0.22)', fontSize: 10, letterSpacing: '0.08em', marginLeft: 4, fontFamily: mono }}>GOVCON INTELLIGENCE</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
            <Link href="#how"     className="nav-link" style={{ color: 'rgba(0,0,0,0.45)', fontSize: 11, letterSpacing: '0.08em', textDecoration: 'none', fontFamily: mono }}>HOW IT WORKS</Link>
            <Link href="/capabilities" className="nav-link" style={{ color: 'rgba(0,0,0,0.45)', fontSize: 11, letterSpacing: '0.08em', textDecoration: 'none', fontFamily: mono }}>CAPABILITIES</Link>
            <Link href="#pricing" className="nav-link" style={{ color: 'rgba(0,0,0,0.45)', fontSize: 11, letterSpacing: '0.08em', textDecoration: 'none', fontFamily: mono }}>PRICING</Link>
            <Link href="/login"   className="nav-link" style={{ color: 'rgba(0,0,0,0.45)', fontSize: 11, letterSpacing: '0.08em', textDecoration: 'none', fontFamily: mono }}>SIGN IN</Link>
            <Link href="/register" className="btn-primary" style={{ padding: '9px 20px', fontSize: 10 }}>GET ACCESS →</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <HeroMetatron />

      {/* ── SWIPE DIVIDER ── */}
      <div style={{ overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <div style={{ height: 3, background: crimson, animation: 'swipeRight 1.2s cubic-bezier(0.25,0.46,0.45,0.94) 0.8s both', transformOrigin: 'left', transform: 'scaleX(0)' }} />
      </div>

      {/* ── PURPOSE ── */}
      <section style={{ padding: '100px 32px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 840, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', color: 'rgba(0,0,0,0.28)', marginBottom: 44 }}>WHY WE EXIST</div>
          <blockquote style={{ fontSize: 'clamp(20px, 2.8vw, 34px)', fontWeight: 700, lineHeight: 1.5, letterSpacing: '-0.02em', margin: '0 0 40px', color: '#0A0A0A', fontStyle: 'normal' }}>
            &ldquo;The tools that find winnable government contracts cost $10,000 a year and a sales call to even see pricing. So the same big firms keep winning. <span style={{ color: crimson }}>IR exists to end that.</span>&rdquo;
          </blockquote>
          <div style={{ width: 48, height: 3, background: crimson, margin: '0 auto 40px' }} />
          <p style={{ fontSize: 16, lineHeight: 1.85, color: 'rgba(0,0,0,0.48)', maxWidth: 600, margin: '0 auto' }}>
            Federal contracting has been gated behind relationships, insider tools, and armies of proposal
            writers for decades. IR gives a five-person company the same intelligence a Fortune 500
            capture team has — for the price of a phone bill.
          </p>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ borderTop: '1px solid rgba(0,0,0,0.07)', borderBottom: '1px solid rgba(0,0,0,0.07)', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ padding: '44px 36px', borderRight: i < 3 ? '1px solid rgba(0,0,0,0.07)' : 'none' }}>
              <div style={{ fontSize: 38, fontWeight: 800, color: crimson, letterSpacing: '-0.03em', marginBottom: 8 }}>{s.value}</div>
              <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#0A0A0A', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" style={{ padding: '100px 32px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 64 }}>
            <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', color: 'rgba(0,0,0,0.28)', marginBottom: 18 }}>SYSTEM ARCHITECTURE</div>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>How IR works</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 1, background: 'rgba(0,0,0,0.06)' }}>
            {HOW.map((item) => (
              <div key={item.n} style={{ background: '#fff', padding: '52px 48px' }}>
                <div style={{ fontFamily: mono, fontSize: 11, color: 'rgba(0,0,0,0.16)', letterSpacing: '0.1em', marginBottom: 22 }}>{item.n}</div>
                <h3 style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: crimson, margin: '0 0 18px' }}>{item.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.8, color: 'rgba(0,0,0,0.52)', margin: 0 }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VS THE INCUMBENTS ── */}
      <section style={{ borderTop: '1px solid rgba(0,0,0,0.07)', background: '#0A0A0A', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 32px' }}>
          <div style={{ marginBottom: 56 }}>
            <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)', marginBottom: 18 }}>THE ALTERNATIVE</div>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.03em', margin: 0, color: '#fff' }}>
              Legacy GovCon intel vs. <span style={{ color: crimson }}>IR</span>
            </h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '14px 20px', fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}></th>
                  <th style={{ textAlign: 'left', padding: '14px 20px', fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.35)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>LEGACY TOOLS</th>
                  <th style={{ textAlign: 'left', padding: '14px 20px', fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', color: crimson, borderBottom: `1px solid ${crimson}` }}>IR</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((row) => (
                  <tr key={row.dim}>
                    <td style={{ padding: '18px 20px', fontFamily: mono, fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>{row.dim}</td>
                    <td style={{ padding: '18px 20px', fontSize: 14, color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{row.them}</td>
                    <td style={{ padding: '18px 20px', fontSize: 14, fontWeight: 600, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{row.ir}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ borderTop: '1px solid rgba(0,0,0,0.07)', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 32px' }}>
          <div style={{ marginBottom: 64 }}>
            <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', color: 'rgba(0,0,0,0.28)', marginBottom: 18 }}>ACCESS TIERS</div>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>Pricing</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: 'rgba(0,0,0,0.06)' }}>
            {PLANS.map((plan) => (
              <div key={plan.tier} style={{ background: '#fff', padding: '48px 40px', position: 'relative' }}>
                {plan.popular && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: crimson }} />}
                <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(0,0,0,0.28)', marginBottom: 18 }}>{plan.name}</div>
                <div style={{ marginBottom: 36 }}>
                  <span style={{ fontSize: 52, fontWeight: 800, letterSpacing: '-0.04em' }}>${plan.price}</span>
                  <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.32)', marginLeft: 6 }}>/mo</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 36px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'rgba(0,0,0,0.58)' }}>
                      <span style={{ color: crimson, flexShrink: 0, fontWeight: 700, marginTop: 1 }}>—</span>{f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.tier === 'enterprise' ? 'mailto:hello@ir-gov.app' : '/register'}
                  className={plan.popular ? 'btn-primary' : 'btn-ghost'}
                  style={{ display: 'block', textAlign: 'center', padding: '14px', fontSize: 11 }}
                >
                  {plan.tier === 'enterprise' ? 'CONTACT →' : 'DEPLOY →'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ background: crimson, padding: '100px 32px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.4)', marginBottom: 32 }}>THE MISSION STARTS HERE</div>
          <h2 style={{ fontSize: 'clamp(30px, 4vw, 56px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', lineHeight: 1.1, margin: '0 0 20px' }}>
            $755 billion in federal contracts.<br />How many match your company?
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', margin: '0 0 48px', lineHeight: 1.7 }}>
            Profile takes 4 minutes. First matches appear in under 60 seconds.
          </p>
          <Link href="/register" className="btn-white">
            START FOR FREE →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(0,0,0,0.08)', padding: '48px 32px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: crimson, fontSize: 20, fontWeight: 700 }}>ᛁ</span>
            <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.1em', color: 'rgba(0,0,0,0.38)' }}>IR GOVCON INTELLIGENCE</span>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[['SIGN IN', '/login'], ['REGISTER', '/register'], ['SECURITY', '/security'], ['TERMS', '/terms'], ['PRIVACY', '/privacy'], ['CONTACT', 'mailto:hello@ir-gov.app']].map(([label, href]) => (
              <Link key={label} href={href} style={{ fontFamily: mono, color: 'rgba(0,0,0,0.28)', fontSize: 10, letterSpacing: '0.1em', textDecoration: 'none' }}>{label}</Link>
            ))}
          </div>
          <div style={{ fontFamily: mono, color: 'rgba(0,0,0,0.18)', fontSize: 10, letterSpacing: '0.06em' }}>
            © {new Date().getFullYear()} IR — DATA SOURCED FROM SAM.GOV
          </div>
        </div>
      </footer>

    </div>
  )
}
 
