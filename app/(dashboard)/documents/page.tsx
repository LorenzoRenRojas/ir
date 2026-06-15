'use client'

import { useEffect, useState } from 'react'
import { DOCUMENT_TEMPLATES } from '@/lib/documents'

interface GeneratedDoc {
  id: string
  type: string
  title: string
  createdAt: string
}

interface ModalState {
  open: boolean
  type: string
  typeName: string
  contractTitle: string
  agency: string
}

const initialModal: ModalState = { open: false, type: '', typeName: '', contractTitle: '', agency: '' }

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: '#0A0A0B',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#E2E8F0',
  fontSize: 13,
  fontFamily: 'var(--font-geist-mono, monospace)',
  outline: 'none',
  boxSizing: 'border-box' as const,
}

const labelStyle = {
  display: 'block',
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.12em',
  color: 'rgba(255,255,255,0.3)',
  marginBottom: 8,
  fontFamily: 'var(--font-geist-mono, monospace)',
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<GeneratedDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalState>(initialModal)
  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => { loadDocs() }, [])

  async function loadDocs() {
    try {
      const res = await fetch('/api/documents/generate')
      const data = await res.json()
      setDocs(data.documents ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function openModal(type: string, typeName: string) {
    setModal({ open: true, type, typeName, contractTitle: '', agency: '' })
    setGeneratedContent(null)
    setError('')
  }

  function closeModal() {
    setModal(initialModal)
    setGeneratedContent(null)
    setError('')
    loadDocs()
  }

  async function handleGenerate() {
    if (!modal.type) return
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: modal.type, contractTitle: modal.contractTitle || undefined, agency: modal.agency || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Generation failed'); return }
      setGeneratedContent(data.content)
    } catch {
      setError('Failed to generate document')
    } finally {
      setGenerating(false)
    }
  }

  function handleDownload() {
    if (!generatedContent) return
    const blob = new Blob([generatedContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${modal.typeName.replace(/\s+/g, '-').toLowerCase()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ padding: '32px 40px', minHeight: '100vh' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.25)', marginBottom: 10 }}>DOCUMENT SUITE</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#E2E8F0', letterSpacing: '-0.02em', margin: 0, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>Document Generator</h1>
      </div>

      {/* Templates */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 1, background: 'rgba(255,255,255,0.05)', marginBottom: 32 }}>
        {DOCUMENT_TEMPLATES.map((tmpl) => (
          <div key={tmpl.id} style={{ background: '#0F0F10', padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 24 }}>{tmpl.icon}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0', marginBottom: 6, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>{tmpl.name}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>{tmpl.description}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 9, letterSpacing: '0.1em', padding: '3px 8px', background: 'rgba(200,169,110,0.08)', color: '#C8A96E', border: '1px solid rgba(200,169,110,0.2)', fontFamily: 'var(--font-geist-mono, monospace)', textTransform: 'uppercase' }}>
                {tmpl.requiredTier}+
              </span>
              <button
                onClick={() => openModal(tmpl.type, tmpl.name)}
                style={{ padding: '7px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', background: '#C8A96E', color: '#0A0A0B', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)' }}
              >
                GENERATE →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* History */}
      <div>
        <div style={{ fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.25)', marginBottom: 16, fontFamily: 'var(--font-geist-mono, monospace)' }}>PREVIOUSLY GENERATED</div>
        {loading ? (
          <div style={{ fontSize: 10, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.2)' }}>LOADING…</div>
        ) : docs.length === 0 ? (
          <div style={{ background: '#0F0F10', border: '1px solid rgba(255,255,255,0.07)', padding: '24px', textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
            No documents generated yet. Use the templates above to get started.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'rgba(255,255,255,0.05)' }}>
            {docs.map((doc) => (
              <div key={doc.id} style={{ background: '#0F0F10', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#E2E8F0', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>{doc.title}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2, letterSpacing: '0.06em' }}>
                    {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                  </div>
                </div>
                <span style={{ fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>{doc.type.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', padding: 16 }}>
          <div style={{ background: '#0F0F10', border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#C8A96E', fontFamily: 'var(--font-geist-mono, monospace)' }}>GENERATE {modal.typeName.toUpperCase()}</div>
              <button onClick={closeModal} style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              {!generatedContent ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>CONTRACT TITLE <span style={{ color: 'rgba(255,255,255,0.2)' }}>(OPTIONAL)</span></label>
                    <input type="text" value={modal.contractTitle} onChange={(e) => setModal((m) => ({ ...m, contractTitle: e.target.value }))} style={inputStyle} placeholder="Enterprise IT Modernization Services" />
                  </div>
                  <div>
                    <label style={labelStyle}>AGENCY NAME <span style={{ color: 'rgba(255,255,255,0.2)' }}>(OPTIONAL)</span></label>
                    <input type="text" value={modal.agency} onChange={(e) => setModal((m) => ({ ...m, agency: e.target.value }))} style={inputStyle} placeholder="Department of Veterans Affairs" />
                  </div>
                  {error && (
                    <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 11 }}>{error}</div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 10, letterSpacing: '0.1em', color: '#4ADE80' }}>DOCUMENT READY</span>
                    <button onClick={handleDownload} style={{ padding: '6px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', background: '#C8A96E', color: '#0A0A0B', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)' }}>
                      ↓ DOWNLOAD
                    </button>
                  </div>
                  <pre style={{ background: '#0A0A0B', border: '1px solid rgba(255,255,255,0.07)', padding: 16, fontSize: 11, color: 'rgba(255,255,255,0.7)', whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: 360, fontFamily: 'var(--font-geist-mono, monospace)', lineHeight: 1.7, margin: 0 }}>
                    {generatedContent}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={closeModal} style={{ padding: '9px 16px', fontSize: 10, letterSpacing: '0.08em', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)' }}>
                {generatedContent ? 'CLOSE' : 'CANCEL'}
              </button>
              {!generatedContent && (
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  style={{ padding: '9px 20px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', background: '#C8A96E', color: '#0A0A0B', border: 'none', cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.6 : 1, fontFamily: 'var(--font-geist-mono, monospace)' }}
                >
                  {generating ? 'GENERATING…' : 'GENERATE DOCUMENT →'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
