'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import EmailCapture from '@/components/EmailCapture'

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

// PUBLIC COMMENT BUILDER — SBA proposed size standards rule.
//
// Deliberately NOT an advocacy tool. It assembles a well-formed comment for
// whichever position the commenter actually holds, including support for the
// rule. A tool that only helps you oppose something is lobbying wearing a
// public-service costume; one that helps anyone participate is the real thing,
// and it is the version we are willing to put our name on.
//
// It also never speaks for the user: every substantive sentence is either
// selected by them or typed by them, and the preview is fully editable before
// it goes anywhere.

const COMMENT_CLOSES = new Date('2026-09-21T23:59:59-04:00')

type Position = 'concerned' | 'supportive' | 'mixed'

const ENTITY_TYPES = [
  'a small business',
  'an 8(a) certified small business',
  'a service-disabled veteran-owned small business',
  'a woman-owned small business',
  'a HUBZone certified small business',
  'a business currently above the small business size standard',
  'an advisor to small federal contractors',
]

// Each concern maps to a specific, checkable feature of the proposed rule.
// Nothing here characterises the rule beyond what it actually proposes.
const CONCERNS: { id: string; label: string; sentence: string }[] = [
  {
    id: 'dilution',
    label: 'More firms competing inside the same set-aside pool',
    sentence:
      'SBA estimates the proposal would make 114,541 additional firms eligible as small businesses, including roughly 37,002 firms that already hold federal contracts — 105,655 contracts worth more than $71 billion in FY2025. Those are established competitors, not new entrants. Because the volume of set-aside work does not increase alongside that eligibility, the practical effect for the smallest firms is a materially more crowded competitive field for the same requirements.',
  },
  {
    id: 'noreductions',
    label: 'Standards rise but none are reduced',
    sentence:
      'The proposal does not reduce any size standard, including in industries where SBA’s own analysis supported a decrease. Applying the methodology asymmetrically means the standards drift permanently upward over successive reviews, which compounds the effect on the smallest firms in each industry.',
  },
  {
    id: 'magnitude',
    label: 'The size of the increases in my industry',
    sentence:
      'In professional services, information technology, engineering and logistics, the proposed thresholds rise substantially, in some cases by a factor of ten or more. An increase of that size changes who a small business competes against in a way that an inflation adjustment alone would not, and I ask SBA to explain the basis for increases of that magnitude in my industry specifically.',
  },
  {
    id: 'consolidation',
    label: 'Consolidating 995 standards into 338',
    sentence:
      'Consolidating 995 size standards into 338 at the 4- and 5-digit NAICS level groups industries with meaningfully different cost structures and capital requirements under a single threshold. A standard calibrated to the larger industries in a group may not reflect the economics of the smaller ones.',
  },
  {
    id: 'employeebased',
    label: 'Converting my industry to an employee-based standard',
    sentence:
      'Converting industries from receipts-based to employee-based standards changes which firms qualify in ways that are not neutral. Labor-intensive firms and firms that rely on subcontractors or automation are affected differently, and the transition should account for that.',
  },
  {
    id: 'productivity',
    label: 'Adding a productivity adjustment on top of inflation',
    sentence:
      'Adding a productivity adjustment on top of inflation, combined with removing the ceiling on size standards, produces increases beyond what is needed to preserve the real value of existing thresholds. The rationale for compounding both adjustments deserves further explanation.',
  },
]

const SUPPORT_POINTS: { id: string; label: string; sentence: string }[] = [
  {
    id: 'graduation',
    label: 'It helps firms that outgrow small status too early',
    sentence:
      'Firms frequently lose small business status before they are able to compete successfully in full and open procurements. Raising thresholds gives growing companies a longer runway to build the past performance and capacity that unrestricted competition requires.',
  },
  {
    id: 'inflation',
    label: 'Existing standards have not kept pace with the economy',
    sentence:
      'Size standards that are not adjusted regularly lose real value as prices and wages rise, which narrows small business eligibility over time without any policy decision to do so. Periodic revision is appropriate.',
  },
  {
    id: 'simplicity',
    label: 'Fewer standards are simpler to administer',
    sentence:
      'Consolidating the number of distinct size standards reduces complexity for both contracting officers and small businesses attempting to determine their own status, which lowers a real barrier to entry.',
  },
]

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 13px', background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.14)', color: '#fff', fontSize: 14,
  fontFamily: sans, outline: 'none', boxSizing: 'border-box', borderRadius: 6,
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
  color: 'rgba(255,255,255,0.4)', marginBottom: 8, fontFamily: mono,
}

export default function CommentBuilder() {
  const [entity, setEntity] = useState(ENTITY_TYPES[0])
  const [naics, setNaics] = useState('')
  const [years, setYears] = useState('')
  const [position, setPosition] = useState<Position>('concerned')
  const [picked, setPicked] = useState<string[]>(['dilution'])
  const [own, setOwn] = useState('')
  const [copied, setCopied] = useState(false)

  // The countdown is resolved after mount, never during render. Server and
  // client clocks straddle the day boundary at different moments, and a
  // date-derived value in the first paint is a guaranteed hydration mismatch.
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => setNow(Date.now()), [])

  const closed = now !== null && now > COMMENT_CLOSES.getTime()
  const daysLeft =
    now === null
      ? null
      : Math.max(0, Math.ceil((COMMENT_CLOSES.getTime() - now) / 86_400_000))

  const pool = position === 'supportive' ? SUPPORT_POINTS : CONCERNS
  const toggle = (id: string) =>
    setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]))

  const comment = useMemo(() => {
    const lines: string[] = []
    lines.push('Re: Small Business Size Standards')
    lines.push('RIN 3245-AI67 / Docket No. SBA-2026-0199')
    lines.push('')

    const intro = `I am submitting this comment as ${entity}${
      naics.trim() ? ` operating primarily in NAICS ${naics.trim()}` : ''
    }${years.trim() ? `, with ${years.trim()} in federal contracting` : ''}.`
    lines.push(intro)
    lines.push('')

    if (position === 'supportive') {
      lines.push('I support the proposed revisions to SBA size standards for the following reasons.')
    } else if (position === 'mixed') {
      lines.push(
        'I support the intent of periodically revising size standards, but I have specific concerns about how this proposal would affect small businesses in my industry.'
      )
    } else {
      lines.push(
        'I am concerned about the effect this proposal would have on small businesses in my industry, for the following reasons.'
      )
    }
    lines.push('')

    const chosen = pool.filter(c => picked.includes(c.id))
    chosen.forEach((c, i) => {
      lines.push(`${i + 1}. ${c.sentence}`)
      lines.push('')
    })

    if (own.trim()) {
      lines.push(own.trim())
      lines.push('')
    }

    if (position === 'supportive') {
      lines.push(
        'I ask that SBA proceed with the proposed revisions and consider the practical effects described above during implementation.'
      )
    } else {
      lines.push(
        'I ask that SBA consider these effects on the smallest firms in each industry before finalizing the rule, and that it explain how the methodology accounts for them.'
      )
    }
    lines.push('')
    lines.push('Thank you for the opportunity to comment.')

    return lines.join('\n')
  }, [entity, naics, years, position, picked, own, pool])

  const copy = () => {
    navigator.clipboard?.writeText(comment).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    }).catch(() => {})
  }

  return (
    <div>
      {/* Deadline state */}
      <div
        style={{
          border: `1px solid ${closed ? 'rgba(255,255,255,0.14)' : 'rgba(196,18,48,0.4)'}`,
          background: closed ? 'rgba(255,255,255,0.03)' : 'rgba(196,18,48,0.07)',
          padding: '16px 20px', marginBottom: 34, borderRadius: 8,
        }}
      >
        {closed ? (
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7, color: 'rgba(255,255,255,0.55)', fontFamily: sans }}>
            <strong style={{ color: '#fff' }}>The comment period closed on September 21, 2026.</strong>{' '}
            The explanation below is kept for reference. The rule remains a proposal until SBA issues a
            final rule, and the docket record stays public.
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7, color: 'rgba(255,255,255,0.6)', fontFamily: sans }}>
            {daysLeft !== null && (
              <>
                <strong style={{ color: crimson }}>
                  {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left to comment.
                </strong>{' '}
              </>
            )}
            SBA must receive comments on or before <strong style={{ color: '#fff' }}>September 21, 2026</strong>.
            Search <strong style={{ color: '#fff', fontFamily: mono }}>Docket SBA-2026-0199</strong> on regulations.gov to submit.
          </p>
        )}
      </div>

      {/* auto-fit, not two fixed tracks: two minmax(280px) columns overflow a
          360px phone, which is where most of this traffic will land. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 28, alignItems: 'start' }}>
        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={labelStyle}>I AM COMMENTING AS</label>
            <select value={entity} onChange={e => setEntity(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              {ENTITY_TYPES.map(t => <option key={t} value={t} style={{ background: '#111' }}>{t}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>PRIMARY NAICS (OPTIONAL)</label>
              <input value={naics} onChange={e => setNaics(e.target.value)} placeholder="541511" maxLength={12} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>TIME IN FEDERAL WORK (OPTIONAL)</label>
              <input value={years} onChange={e => setYears(e.target.value)} placeholder="six years" maxLength={40} style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>MY POSITION</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {([
                ['concerned', 'Concerned'],
                ['mixed', 'Mixed'],
                ['supportive', 'Supportive'],
              ] as [Position, string][]).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => { setPosition(v); setPicked([]) }}
                  style={{
                    padding: '9px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                    fontFamily: mono, cursor: 'pointer', borderRadius: 6,
                    background: position === v ? crimson : 'transparent',
                    color: position === v ? '#fff' : 'rgba(255,255,255,0.5)',
                    border: `1px solid ${position === v ? crimson : 'rgba(255,255,255,0.16)'}`,
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>
              {position === 'supportive' ? 'POINTS I WANT TO MAKE' : 'WHAT CONCERNS ME'}
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {pool.map(c => {
                const on = picked.includes(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggle(c.id)}
                    style={{
                      textAlign: 'left', padding: '11px 14px', fontSize: 13, lineHeight: 1.5,
                      fontFamily: sans, cursor: 'pointer', borderRadius: 6,
                      background: on ? 'rgba(196,18,48,0.11)' : 'transparent',
                      color: on ? '#fff' : 'rgba(255,255,255,0.55)',
                      border: `1px solid ${on ? 'rgba(196,18,48,0.45)' : 'rgba(255,255,255,0.12)'}`,
                      display: 'flex', gap: 11, alignItems: 'center',
                    }}
                  >
                    <span style={{ color: on ? crimson : 'rgba(255,255,255,0.25)', fontFamily: mono, fontWeight: 700, flexShrink: 0 }}>
                      {on ? '◈' : '◇'}
                    </span>
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label style={labelStyle}>IN YOUR OWN WORDS (STRONGLY RECOMMENDED)</label>
            <textarea
              value={own}
              onChange={e => setOwn(e.target.value)}
              rows={4}
              maxLength={1500}
              placeholder="What would this actually change for your company? A specific, concrete example from your own experience carries more weight with reviewers than anything a form can generate."
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>
        </div>

        {/* Preview */}
        <div style={{ position: 'sticky', top: 20 }}>
          <label style={labelStyle}>YOUR COMMENT</label>
          <pre
            style={{
              margin: 0, padding: '20px', background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
              color: 'rgba(255,255,255,0.72)', fontSize: 12.5, lineHeight: 1.75,
              whiteSpace: 'pre-wrap', fontFamily: sans, maxHeight: 520, overflowY: 'auto',
            }}
          >
            {comment}
          </pre>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={copy}
              style={{
                flex: 1, minWidth: 150, padding: '13px 20px', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.1em', fontFamily: mono, cursor: 'pointer', borderRadius: 6,
                background: copied ? 'rgba(74,222,128,0.14)' : crimson,
                color: copied ? '#4ADE80' : '#fff',
                border: copied ? '1px solid rgba(74,222,128,0.4)' : 'none',
              }}
            >
              {copied ? 'COPIED ✓' : 'COPY COMMENT'}
            </button>
          </div>
          <p style={{ fontSize: 11.5, lineHeight: 1.65, color: 'rgba(255,255,255,0.3)', marginTop: 14, fontFamily: sans }}>
            Read it before you send it, and edit anything that is not true for your business. Identical
            form comments carry far less weight than a specific one, which is why the box above matters
            more than the checkboxes.
          </p>
        </div>
      </div>

      {/* Separate from the comment on purpose: the comment never leaves the
          browser, and the page says so. This is a distinct, optional ask. */}
      <div style={{ marginTop: 40, padding: '28px 28px 24px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }}>
        <EmailCapture
          source="sba-comment"
          headline="Want to know what happens to this rule?"
          sub="One email a week with what IR tracked across SAM.gov, plus a line on this docket when it moves — comment count, final rule, effective date. No account."
        />
      </div>

      <div style={{ marginTop: 40, padding: '24px 26px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }}>
        <p style={{ fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.3)', margin: '0 0 12px', fontFamily: mono }}>
          NOT SURE WHICH PROGRAMS YOU QUALIFY FOR?
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.5)', margin: '0 0 18px', fontFamily: sans, maxWidth: 620 }}>
          If this rule is adopted, the narrower certifications — 8(a), SDVOSB, WOSB, HUBZone — do not
          expand the way the broad small business category would. Knowing which ones you qualify for
          matters more, not less. We built a free check that takes five questions and no signup.
        </p>
        <Link
          href="/eligibility"
          style={{ display: 'inline-block', padding: '12px 26px', background: crimson, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none', fontFamily: mono, borderRadius: 6 }}
        >
          CHECK YOUR ELIGIBILITY →
        </Link>
      </div>
    </div>
  )
}
