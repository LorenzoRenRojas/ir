import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { generatePosts } from '@/lib/post-generator'
import CopyBlock from './CopyBlock'

export const dynamic = 'force-dynamic'

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

export default async function PostStudioPage() {
  const session = await requireAdmin()
  if (!session) redirect('/dashboard')

  const posts = await generatePosts()

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', padding: '48px clamp(20px, 5vw, 64px)', fontFamily: mono }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <Link href="/admin" style={{ textDecoration: 'none' }}>
            <span style={{ color: crimson, fontSize: 20, fontWeight: 700 }}>ᛁ</span>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', marginLeft: 8 }}>IR</span>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, letterSpacing: '0.1em', marginLeft: 6 }}>POST STUDIO</span>
          </Link>
        </div>

        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 10px', fontFamily: sans }}>
          This week, from the data.
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.7, margin: '0 0 12px', maxWidth: 620, fontFamily: sans }}>
          Generated from what is actually in the contract store right now. Nobody else publishes this,
          because nobody else is watching the whole market nightly.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12.5, lineHeight: 1.7, margin: '0 0 36px', maxWidth: 620, fontFamily: sans }}>
          These are drafts. Read the data note on each one before you post it — that is the claim you
          are making, and you should be able to defend it if someone asks.
        </p>

        {posts.length === 0 ? (
          <div style={{ border: '1px dashed rgba(255,255,255,0.18)', padding: '32px 28px', color: 'rgba(255,255,255,0.4)', fontSize: 13.5, lineHeight: 1.7, fontFamily: sans }}>
            Nothing worth publishing yet. Each draft needs a minimum sample before it will generate —
            a post built on eleven records is worse than no post. Run a contract sync and check back.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {posts.map(p => (
              <div key={p.kind} style={{ border: '1px solid rgba(255,255,255,0.09)', background: '#111' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ color: crimson, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em' }}>{p.kind.toUpperCase()}</div>
                    <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginTop: 4, fontFamily: sans }}>{p.label}</div>
                  </div>
                  <CopyBlock text={`${p.body}\n\n${p.hashtags}`} label="COPY POST" />
                </div>

                <pre style={{ margin: 0, padding: '20px', color: 'rgba(255,255,255,0.72)', fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap', fontFamily: sans }}>
                  {p.body}
                </pre>

                <div style={{ padding: '0 20px 16px', color: crimson, fontSize: 12, fontFamily: sans }}>{p.hashtags}</div>

                <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11.5, fontFamily: sans }}>
                    <strong style={{ color: 'rgba(255,255,255,0.55)' }}>First comment:</strong> {p.firstComment}
                  </div>
                  <CopyBlock text={p.firstComment} label="COPY LINK" small />
                </div>

                <div style={{ padding: '12px 20px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 9, letterSpacing: '0.14em', marginBottom: 6 }}>WHAT THIS CLAIM IS BUILT ON</div>
                  <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: 12, lineHeight: 1.65, fontFamily: sans }}>{p.dataNote}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 40, padding: '20px 24px', border: '1px solid rgba(255,255,255,0.09)' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12.5, lineHeight: 1.7, margin: 0, fontFamily: sans }}>
            Put the link in the first comment, never in the post body. LinkedIn suppresses reach on
            posts that send people off-platform, and it routes around the link warning on the domain.
          </p>
        </div>
      </div>
    </div>
  )
}
