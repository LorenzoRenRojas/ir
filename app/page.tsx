import Link from 'next/link'
import HeroMetatron from '@/components/HeroMetatron'
import EmailCapture from '@/components/EmailCapture'

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
  // Claims policy: market facts cite a source; IR facts describe what IR does,
  // never a completeness it doesn't have. (The old "30K+ open solicitations,
  // scored daily" implied the store was a census of SAM.gov. It is a synced
  // subset.) FY2025 contract obligations: GAO reports more than $793B.
  { value: '$793B+', label: 'ANNUAL MARKET',      sub: 'U.S. federal contract obligations, FY2025 (GAO)' },
  { value: '3',      label: 'TIERS OF EVIDENCE',  sub: 'every score shows what is measured, what is rule, what is judgment' },
  { value: '400+',   label: 'FEDERAL AGENCIES',   sub: 'posting opportunities across all branches' },
  { value: '5',      label: 'WIN FACTORS SCORED', sub: 'per opportunity, per company profile' },
]

const HOW = [
  { n: '01', title: 'BUILD YOUR PROFILE',  body: 'Tell us your NAICS codes, certifications, clearances, and past performance once — or just paste your SAM.gov UEI and we pull it for you. That becomes the yardstick every contract is measured against.' },
  { n: '02', title: 'WE SCORE THE MARKET', body: 'Every contract IR tracks is scored against your profile — NAICS fit, set-aside eligibility, contract size, and geography — so you see only the work you can realistically win, ranked best-first.' },
  { n: '03', title: 'GET YOUR MATCHES',    body: 'Your best matches land in your dashboard and in a morning email the day they post — with a win-probability read, who the incumbent is, and deadline reminders at 3 days and 24 hours out.' },
  { n: '04', title: 'DRAFT & SEND',        body: 'Answer a short guided questionnaire and IR turns it into a formatted, four-volume federal proposal — plus one-click capability statements. Review it, then send it straight to the contracting officer.' },
]

// Head-to-head vs the incumbents
const COMPARE = [
  { dim: 'PRICE',              them: '$12,000–$40,000 / year',        ir: 'From $79 / month' },
  { dim: 'GETTING STARTED',    them: 'Sales call, demo, annual contract', ir: 'Self-serve — matching in 5 minutes' },
  { dim: 'MATCH SCORING',      them: 'Filters + saved searches',      ir: 'Scored to your profile, learns from every save' },
  { dim: 'PRE-RFP INTEL',      them: 'Analyst reports, premium tier', ir: 'Recompete Radar — scored & automated, included' },
  { dim: 'PROPOSAL HELP',      them: 'None — intelligence only',      ir: 'Capability statements + proposal drafts' },
  { dim: 'CONTRACTING OFFICER',them: 'Look it up yourself',           ir: 'One click — proposal sent, replies to your inbox' },
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div className="nav-links-desktop" style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
              <Link href="/how-to-win" className="nav-link" style={{ color: 'rgba(0,0,0,0.45)', fontSize: 11, letterSpacing: '0.08em', textDecoration: 'none', fontFamily: mono }}>HOW TO WIN</Link>
              <Link href="/capabilities" className="nav-link" style={{ color: 'rgba(0,0,0,0.45)', fontSize: 11, letterSpacing: '0.08em', textDecoration: 'none', fontFamily: mono }}>CAPABILITIES</Link>
              <Link href="#pricing" className="nav-link" style={{ color: 'rgba(0,0,0,0.45)', fontSize: 11, letterSpacing: '0.08em', textDecoration: 'none', fontFamily: mono }}>PRICING</Link>
            </div>
            <Link href="/login"   className="nav-link" style={{ color: 'rgba(0,0,0,0.45)', fontSize: 11, letterSpacing: '0.08em', textDecoration: 'none', fontFamily: mono, whiteSpace: 'nowrap' }}>SIGN IN</Link>
            <Link href="/register" className="btn-primary" style={{ padding: '9px 20px', fontSize: 10, whiteSpace: 'nowrap' }}>GET ACCESS →</Link>
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
          <p style={{ fontSize: 16, lineHeight: 1.85, color: 'rgba(0,0,0,0.48)', maxWidth: 620, margin: '0 auto' }}>
            Federal contracting has been gated behind relationships, insider tools, and armies of proposal
            writers for decades. IR gives a five-person shop the same intelligence a Fortune 500 capture
            team runs on — and the tools to act on it the same day.
            <span style={{ color: '#0A0A0A', fontWeight: 600 }}> We built it first, for the operators the incumbents priced out.</span>
          </p>
        </div>
      </section>

      {/* ── CAPITAL · INFORMATION · EXECUTION ── */}
      <section style={{ borderTop: '1px solid rgba(0,0,0,0.07)', padding: '100px 32px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 56 }}>
            <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', color: 'rgba(0,0,0,0.28)', marginBottom: 18 }}>WHAT WE PUT IN YOUR HANDS</div>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 16px' }}>
              Capital. Information. <span style={{ color: crimson }}>Execution.</span>
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.8, color: 'rgba(0,0,0,0.48)', maxWidth: 620, margin: 0 }}>
              The three things that win federal contracts. Most tools hand you one of them. IR is all three —
              the reason a small shop can move like a capture team.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 1, background: 'rgba(0,0,0,0.06)' }}>
            {[
              { n: 'I', title: 'CAPITAL', body: 'Every hour spent hunting is capital burned; every legacy license is capital surrendered. IR surfaces winnable work on day one and keeps both — your team’s time and the five-figure fees the incumbents charge — inside your business.' },
              { n: 'II', title: 'INFORMATION', body: 'We read the federal market so you don’t have to — the solicitations IR pulls from SAM.gov every night, the contracts about to expire, the incumbents and what they were paid — scored against your company and refreshed daily.' },
              { n: 'III', title: 'EXECUTION', body: 'Knowing isn’t winning. IR turns a match into a submitted proposal in the same sitting: capability statements, four-volume drafts, sent straight to the contracting officer. Act immediately, not next quarter.' },
            ].map((c) => (
              <div key={c.title} style={{ background: '#fff', padding: '48px 40px' }}>
                <div style={{ fontFamily: mono, fontSize: 11, color: 'rgba(0,0,0,0.18)', letterSpacing: '0.14em', marginBottom: 22 }}>{c.n}</div>
                <h3 style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', color: crimson, margin: '0 0 18px' }}>{c.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.8, color: 'rgba(0,0,0,0.55)', margin: 0 }}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ borderTop: '1px solid rgba(0,0,0,0.07)', borderBottom: '1px solid rgba(0,0,0,0.07)', position: 'relative', zIndex: 1 }}>
        {/* auto-fit, not four fixed tracks: fixed columns are what pushed this
            page to 691px on a 390px phone. */}
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 1, background: 'rgba(0,0,0,0.07)' }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ padding: '44px 36px', background: '#fff' }}>
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
            <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', color: 'rgba(0,0,0,0.28)', marginBottom: 18 }}>FROM PROFILE TO PROPOSAL</div>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>How IR works</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 1, background: 'rgba(0,0,0,0.06)' }}>
            {HOW.map((item) => (
              <div key={item.n} style={{ background: '#fff', padding: '52px 48px' }}>
                <div style={{ fontFamily: mono, fontSize: 11, color: 'rgba(0,0,0,0.16)', letterSpacing: '0.1em', marginBottom: 22 }}>{item.n}</div>
                <h3 style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: crimson, margin: '0 0 18px' }}>{item.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.8, color: 'rgba(0,0,0,0.52)', margin: 0 }}>{item.body}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <Link href="/how-it-works" style={{ display: 'inline-block', padding: '13px 28px', border: `1px solid ${crimson}`, color: crimson, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textDecoration: 'none', fontFamily: mono }}>
              SEE THE FULL SYSTEM BREAKDOWN →
            </Link>
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
                  <th style={{ textAlign: 'left', padding: '14px 20px', fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.35)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>ENTERPRISE TERMINALS</th>
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
          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <Link href="/capabilities" style={{ display: 'inline-block', padding: '13px 28px', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textDecoration: 'none', fontFamily: mono }}>
              SEE FULL CAPABILITIES + CHARTS →
            </Link>
          </div>
        </div>
      </section>

      {/* ── EVIDENCE TIERS — the positioning. A score that shows its work is the
          one thing a competitor cannot copy in a marketing sprint, and the one
          thing you can screenshot. Definitions mirror /capabilities. ── */}
      <section style={{ borderTop: '1px solid rgba(0,0,0,0.07)', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 32px' }}>
          <div style={{ marginBottom: 56, maxWidth: 720 }}>
            <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', color: 'rgba(0,0,0,0.28)', marginBottom: 18 }}>WHY YOU CAN TRUST THE NUMBER</div>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 20px', lineHeight: 1.1 }}>
              A score is a claim. <span style={{ color: crimson }}>Ours shows its work.</span>
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: 'rgba(0,0,0,0.5)', margin: 0 }}>
              If we want you to bet real weeks on a number, we should show you where it came from. Every IR
              score breaks into three kinds of evidence and tells you which is which — so you know what is
              counted, what is rule, and what is still judgment.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 1, background: 'rgba(0,0,0,0.06)' }}>
            {[
              { tag: 'MEASURED', color: '#16a34a', title: 'Counted from real awards', body: 'Your own federal award history, pulled from public records by UEI, and the outcomes of contracts IR has already watched close. “You have won three awards in this NAICS code” is a count, not an opinion.' },
              { tag: 'STRUCTURAL', color: '#0A0A0A', title: 'True by published rule', body: 'Set-aside eligibility, size standards, NAICS fit. These are the government’s own rules applied to your profile — right by definition, and the first thing that can disqualify a bid.' },
              { tag: 'HEURISTIC', color: '#b45309', title: 'Reasoned, not yet validated', body: 'Incumbent size as a proxy for entrenchment, for example. Defensible, but not yet checked against outcomes — so it is labeled, and it is the part that shrinks as the evidence record grows.' },
            ].map(t => (
              <div key={t.tag} style={{ background: '#fff', padding: '40px 36px' }}>
                <div style={{ display: 'inline-block', fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: t.color, border: `1px solid ${t.color}`, padding: '4px 10px', marginBottom: 20 }}>{t.tag}</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em', margin: '0 0 12px' }}>{t.title}</h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.75, color: 'rgba(0,0,0,0.52)', margin: 0 }}>{t.body}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'rgba(0,0,0,0.4)', maxWidth: 720, margin: '28px 0 0' }}>
            The outcome record is still accumulating, so IR does not claim its score is a calibrated
            probability yet. Every solicitation IR tracks is matched to its eventual award, and calibration
            gets published the moment the sample supports it — including if it is unflattering.{' '}
            <Link href="/capabilities" style={{ color: crimson, textDecoration: 'none', fontWeight: 600 }}>How the scoring works →</Link>
          </p>
        </div>
      </section>

      {/* ── RECOMPETE RADAR — flagship differentiator (legacy tools sell this at $10K+/yr) ── */}
      <section style={{ borderTop: '1px solid rgba(0,0,0,0.07)', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 56, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', color: crimson, marginBottom: 18 }}>◎ RECOMPETE RADAR — THE $10K/YR FEATURE, INCLUDED</div>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 20px', lineHeight: 1.1 }}>
              See contracts <span style={{ color: crimson }}>before they exist.</span>
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: 'rgba(0,0,0,0.5)', margin: '0 0 16px' }}>
              Every federal contract expires on a known date — and most become recompete solicitations.
              IR scans the government&apos;s own award data for contracts in your NAICS codes ending within
              18 months, shows you the incumbent and what they were paid, and scores each one on timing,
              size fit, agency history, and your learned preferences.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.85, color: 'rgba(0,0,0,0.5)', margin: '0 0 32px' }}>
              That&apos;s a <strong style={{ color: '#0A0A0A' }}>6–18 month head start</strong> before anything
              appears on SAM.gov — the intelligence legacy platforms sell through human analysts at $10k+ a year,
              automated, with email alerts when something new hits your radar.
            </p>
            <Link href="/capabilities" style={{ display: 'inline-block', padding: '13px 28px', border: `1px solid ${crimson}`, color: crimson, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textDecoration: 'none', fontFamily: mono }}>
              SEE HOW THE RADAR WORKS →
            </Link>
          </div>
          {/* Mock radar card stack. Right padding reserves the room the
              staggered translateX needs — a transform still counts toward
              scroll width, and the third card was the last 10px of sideways
              scroll on phones. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 28 }}>
            {[
              { score: 87, desc: 'Enterprise IT support services — recompete window opening', inc: 'INCUMBENT CORP A', val: '$2.4M', ends: 'ENDS MAR 2027 · ~8 MO', color: '#16a34a' },
              { score: 74, desc: 'Cybersecurity operations center staffing', inc: 'INCUMBENT CORP B', val: '$890K', ends: 'ENDS DEC 2026 · ~5 MO', color: crimson },
              { score: 61, desc: 'Logistics & warehouse modernization program', inc: 'INCUMBENT CORP C', val: '$5.1M', ends: 'ENDS SEP 2027 · ~14 MO', color: crimson },
            ].map((c, i) => (
              <div key={i} style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)', borderLeft: `3px solid ${c.color}`, padding: '16px 20px', transform: `translateX(${i * 14}px)` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: c.color }}>{c.score}%</span>
                  <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${c.score}%`, background: c.color, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>RECOMPETE</span>
                </div>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{c.desc}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{c.inc} · {c.val}</span>
                  <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, color: c.color }}>{c.ends}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ borderTop: '1px solid rgba(0,0,0,0.07)', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 32px' }}>
          <div style={{ marginBottom: 64 }}>
            <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', color: 'rgba(0,0,0,0.28)', marginBottom: 18 }}>ACCESS TIERS</div>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 16px' }}>Pricing</h2>
            {/* Billing is not live yet. Say so, and turn it into the founding
                offer instead of leaving a price list nobody can pay. */}
            <p style={{ fontSize: 15, lineHeight: 1.75, color: 'rgba(0,0,0,0.5)', maxWidth: 640, margin: 0 }}>
              <strong style={{ color: '#0A0A0A' }}>Billing is not switched on yet.</strong> Founding members get
              full access free now, and keep founder pricing when it opens. Ten seats, hand-onboarded by the
              person who built it.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 1, background: 'rgba(0,0,0,0.06)' }}>
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
                  {plan.tier === 'enterprise' ? 'CONTACT →' : 'START FREE →'}
                </Link>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <Link href="/pricing" style={{ display: 'inline-block', padding: '13px 28px', border: `1px solid ${crimson}`, color: crimson, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textDecoration: 'none', fontFamily: mono }}>
              SEE PLANS, ROI MATH + COST CHARTS →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FREE TOOLS + THE OWNED LIST — the lighter asks. Most visitors are
          not ready to build a profile; these are the steps they will take. ── */}
      <section style={{ borderTop: '1px solid rgba(0,0,0,0.07)', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 56, alignItems: 'start' }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', color: 'rgba(0,0,0,0.28)', marginBottom: 18 }}>FREE, NO ACCOUNT</div>
            <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 28px', lineHeight: 1.1 }}>Useful before you sign up for anything.</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { href: '/eligibility', title: 'Set-aside eligibility check', body: 'Five questions. Which of 8(a), WOSB, SDVOSB, HUBZone and small business you likely qualify for, and what each one is worth.' },
                { href: '/sba-comment', title: 'SBA size standards comment builder', body: 'SBA has proposed redrawing what counts as small. Build a properly formatted public comment in two minutes. Comments close September 21, 2026.' },
                { href: '/how-to-win', title: 'How federal contracts are actually won', body: 'The capture process the big firms run, written for a five-person shop.' },
              ].map(t => (
                <Link key={t.href} href={t.href} style={{ display: 'block', padding: '20px 22px', border: '1px solid rgba(0,0,0,0.1)', textDecoration: 'none', color: '#0A0A0A' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{t.title} <span style={{ color: crimson }}>→</span></div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.65, color: 'rgba(0,0,0,0.5)' }}>{t.body}</div>
                </Link>
              ))}
            </div>
          </div>
          <div style={{ padding: '32px 32px 28px', border: '1px solid rgba(0,0,0,0.1)', background: '#FAFAF9' }}>
            <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', color: 'rgba(0,0,0,0.28)', marginBottom: 18 }}>THE WEEKLY REPORT</div>
            <EmailCapture source="home" theme="light" />
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ background: crimson, padding: '100px 32px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.4)', marginBottom: 32 }}>THE MISSION STARTS HERE</div>
          <h2 style={{ fontSize: 'clamp(30px, 4vw, 56px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', lineHeight: 1.1, margin: '0 0 20px' }}>
            $793 billion in federal contracts.<br />How many match your company?
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
            {[['ELIGIBILITY CHECK', '/eligibility'], ['SBA COMMENT', '/sba-comment'], ['HOW TO WIN', '/how-to-win'], ['AGENCIES', '/agencies'], ['SET-ASIDES', '/set-asides'], ['NAICS', '/naics'], ['STATES', '/states'], ['CHANGELOG', '/changelog'], ['SIGN IN', '/login'], ['REGISTER', '/register'], ['SECURITY', '/security'], ['TERMS', '/terms'], ['PRIVACY', '/privacy'], ['CONTACT', 'mailto:hello@ir-gov.app']].map(([label, href]) => (
              <Link key={label} href={href} style={{ fontFamily: mono, color: 'rgba(0,0,0,0.28)', fontSize: 10, letterSpacing: '0.1em', textDecoration: 'none' }}>{label}</Link>
            ))}
          </div>
          <div style={{ fontFamily: mono, color: 'rgba(0,0,0,0.18)', fontSize: 10, letterSpacing: '0.06em' }}>
            © {new Date().getFullYear()} IR — DATA SOURCED FROM SAM.GOV
          </div>
        </div>
        {/* Affiliation disclaimer, stated plainly and site-visible. A domain
            containing "gov" plus a sign-in form is the exact shape automated
            phishing classifiers flag, so this must live where a scanner (and a
            first-time visitor) actually sees it — not only in the Terms page. */}
        <div style={{ maxWidth: 1200, margin: '24px auto 0', paddingTop: 20, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <p style={{ fontFamily: sans, color: 'rgba(0,0,0,0.3)', fontSize: 11, lineHeight: 1.6, margin: 0, maxWidth: 780 }}>
            IR is an independent, privately owned software company. IR is not a government
            website and is not affiliated with, endorsed by, or officially associated with
            the U.S. General Services Administration, the Department of Defense, the Small
            Business Administration, or any other federal agency. Contract information is
            sourced from publicly available U.S. government data, including SAM.gov and
            USAspending.gov.
          </p>
        </div>
      </footer>

    </div>
  )
}
 
