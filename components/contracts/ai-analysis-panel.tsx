'use client'

import { useState, useEffect } from 'react'
import type { Contract } from '@/lib/sam-api'
import type { AIDetailAnalysis } from '@/app/api/ai/analyze/detail/route'

export function AIAnalysisPanel({ contract }: { contract: Contract }) {
  const [analysis, setAnalysis] = useState<AIDetailAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requested, setRequested] = useState(false)

  async function load() {
    setRequested(true)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/analyze/detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract }),
      })
      const data = await res.json()
      if (data.analysis) {
        setAnalysis(data.analysis)
      } else {
        setError('Analysis unavailable.')
      }
    } catch {
      setError('Failed to load analysis.')
    } finally {
      setLoading(false)
    }
  }

  const winColor = analysis
    ? analysis.winProbability >= 60 ? '#16a34a'
    : analysis.winProbability >= 35 ? '#b45309'
    : '#C41230'
    : '#64748b'

  if (!requested) {
    return (
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', padding: '24px' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 12 }}>AI ANALYSIS</div>
        <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', lineHeight: 1.6, margin: '0 0 16px', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
          Get an in-depth assessment of fit, risks, and next steps for this opportunity.
        </p>
        <button
          onClick={load}
          style={{ width: '100%', padding: '10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', background: '#0A0A0A', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)' }}
        >
          ANALYZE WITH AI →
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', padding: '24px' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 16 }}>AI ANALYSIS</div>
        <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.25)', letterSpacing: '0.08em', fontFamily: 'var(--font-geist-mono, monospace)', marginBottom: 12 }}>ANALYZING…</div>
        <div style={{ width: '100%', height: 2, background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '40%', background: '#C41230', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
      </div>
    )
  }

  if (error || !analysis) {
    return (
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', padding: '24px' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 12 }}>AI ANALYSIS</div>
        <div style={{ fontSize: 11, color: '#C41230', marginBottom: 12 }}>{error || 'Analysis unavailable.'}</div>
        <button onClick={load} style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', padding: '6px 12px', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)', letterSpacing: '0.06em' }}>
          RETRY
        </button>
      </div>
    )
  }

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)' }}>AI ANALYSIS</div>

      {/* Win probability */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <span style={{ fontSize: 42, fontWeight: 700, color: winColor, fontFamily: 'var(--font-geist-sans, sans-serif)', lineHeight: 1 }}>{analysis.winProbability}</span>
        <span style={{ fontSize: 14, color: 'rgba(0,0,0,0.25)', marginBottom: 4 }}>% WIN PROB</span>
      </div>

      {/* Fit summary */}
      <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.6)', lineHeight: 1.7, margin: 0, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
        {analysis.fitSummary}
      </p>

      {/* Strengths */}
      {analysis.strengths.length > 0 && (
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: '#16a34a', marginBottom: 8 }}>STRENGTHS</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {analysis.strengths.map((s, i) => (
              <li key={i} style={{ fontSize: 11, color: 'rgba(0,0,0,0.55)', lineHeight: 1.5, display: 'flex', gap: 8, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
                <span style={{ color: '#16a34a', flexShrink: 0 }}>+</span>{s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risks */}
      {analysis.risks.length > 0 && (
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: '#C41230', marginBottom: 8 }}>RISKS</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {analysis.risks.map((r, i) => (
              <li key={i} style={{ fontSize: 11, color: 'rgba(0,0,0,0.55)', lineHeight: 1.5, display: 'flex', gap: 8, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
                <span style={{ color: '#C41230', flexShrink: 0 }}>−</span>{r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Competition */}
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.25)', marginBottom: 6 }}>COMPETITION</div>
        <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.5)', lineHeight: 1.6, margin: 0, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>{analysis.competitionNotes}</p>
      </div>

      {/* Next steps */}
      {analysis.nextSteps.length > 0 && (
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.25)', marginBottom: 8 }}>NEXT STEPS</div>
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {analysis.nextSteps.map((step, i) => (
              <li key={i} style={{ fontSize: 11, color: 'rgba(0,0,0,0.55)', lineHeight: 1.5, display: 'flex', gap: 8, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(0,0,0,0.25)', flexShrink: 0, paddingTop: 1, fontFamily: 'var(--font-geist-mono, monospace)' }}>{String(i + 1).padStart(2, '0')}</span>{step}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div style={{ paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.06)', fontSize: 9, color: 'rgba(0,0,0,0.2)', letterSpacing: '0.08em', fontFamily: 'var(--font-geist-mono, monospace)' }}>
        POWERED BY CLAUDE AI · NOT LEGAL ADVICE
      </div>
    </div>
  )
}
