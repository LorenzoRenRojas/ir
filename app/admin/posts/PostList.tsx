import type { GeneratedPost } from '@/lib/post-generator'
import CopyBlock from './CopyBlock'

const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

export function imageUrl(img: NonNullable<GeneratedPost['image']>): string {
  return `/api/post-image?stat=${encodeURIComponent(img.stat)}&label=${encodeURIComponent(img.label)}&sub=${encodeURIComponent(img.sub)}`
}

export default function PostList({ posts }: { posts: GeneratedPost[] }) {
  if (posts.length === 0) {
    return (
      <div style={{ border: '1px dashed rgba(255,255,255,0.18)', padding: '32px 28px', color: 'rgba(255,255,255,0.4)', fontSize: 13.5, lineHeight: 1.7, fontFamily: sans }}>
        Nothing worth publishing yet. Each data-driven draft needs a minimum sample before it will
        generate — a post built on eleven records is worse than no post. Run a contract sync and check back.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {posts.map(p => {
        const img = p.image ? imageUrl(p.image) : null
        return (
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

            {img && (
              <div style={{ padding: '0 20px 18px' }}>
                <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 9, letterSpacing: '0.14em', marginBottom: 10 }}>ATTACH THIS IMAGE</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" width={260} height={260} style={{ border: '1px solid rgba(255,255,255,0.1)', display: 'block' }} />
                <a href={img} download={`ir-${p.kind}.png`} style={{ display: 'inline-block', marginTop: 10, padding: '7px 14px', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#fff', background: crimson, textDecoration: 'none' }}>
                  DOWNLOAD PNG
                </a>
              </div>
            )}

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
        )
      })}
    </div>
  )
}
