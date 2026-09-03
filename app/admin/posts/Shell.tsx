import Link from 'next/link'

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

const TABS = [
  { href: '/admin/posts/company', label: 'COMPANY PAGE' },
  { href: '/admin/posts/founder', label: 'YOUR PROFILE' },
  { href: '/admin/posts/topics', label: 'TOPICS' },
  { href: '/admin/posts/graphics', label: 'GRAPHICS' },
]

export default function Shell({
  active, title, intro, children,
}: { active: string; title: string; intro: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', padding: '40px clamp(20px, 5vw, 64px)', fontFamily: mono }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <Link href="/admin" style={{ textDecoration: 'none' }}>
            <span style={{ color: crimson, fontSize: 20, fontWeight: 700 }}>ᛁ</span>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', marginLeft: 8 }}>IR</span>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, letterSpacing: '0.1em', marginLeft: 6 }}>POST STUDIO</span>
          </Link>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 30, flexWrap: 'wrap' }}>
          {TABS.map(t => {
            const on = t.href === active
            return (
              <Link key={t.href} href={t.href} style={{
                padding: '9px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                textDecoration: 'none',
                background: on ? crimson : 'transparent',
                color: on ? '#fff' : 'rgba(255,255,255,0.45)',
                border: `1px solid ${on ? crimson : 'rgba(255,255,255,0.14)'}`,
              }}>{t.label}</Link>
            )
          })}
        </div>

        <h1 style={{ color: '#fff', fontSize: 25, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 10px', fontFamily: sans }}>{title}</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13.5, lineHeight: 1.7, margin: '0 0 30px', maxWidth: 620, fontFamily: sans }}>{intro}</p>

        {children}

        <div style={{ marginTop: 36, padding: '18px 22px', border: '1px solid rgba(255,255,255,0.09)' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12.5, lineHeight: 1.7, margin: 0, fontFamily: sans }}>
            Read the data note before posting — that is the claim you are making. <strong style={{ color: 'rgba(255,255,255,0.6)' }}>No links in
            posts, and none in the first comment either.</strong> LinkedIn cuts reach on posts carrying external
            links, and now throttles first-comment links as bridge behaviour. Close with the CTA instead
            and let your Featured section do the converting — which also sidesteps the suspicious-link
            warning on the domain.
          </p>
        </div>
      </div>
    </div>
  )
}
