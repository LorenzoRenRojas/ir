'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Proposal {
  id: string
  type: string
  title: string
  contractTitle: string | null
  agencyName: string | null
  noticeId: string | null
  createdAt: string
}

interface SavedContract {
  id: string
  contractId: string
  title: string
  agency: string
  deadline: string | null
  samNoticeId: string | null
}

interface ModalState {
  open: boolean
  // pre-filled from a saved contract
  noticeId: string
  contractTitle: string
  agencyName: string
  // optional detail fields
  solicitationNumber: string
  issuingOffice: string
  responseDeadline: string
  estimatedValue: string
  placeOfPerformance: string
}

const blankModal: ModalState = {
  open: false,
  noticeId: '',
  contractTitle: '',
  agencyName: '',
  solicitationNumber: '',
  issuingOffice: '',
  responseDeadline: '',
  estimatedValue: '',
  placeOfPerformance: '',
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: '#F8F8F7',
  border: '1px solid rgba(0,0,0,0.1)',
  color: '#0A0A0A',
  fontSize: 13,
  fontFamily: 'var(--font-geist-sans, sans-serif)',
  outline: 'none',
  boxSizing: 'border-box' as const,
}

const labelStyle = {
  display: 'block',
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.12em',
  color: 'rgba(0,0,0,0.35)',
  marginBottom: 8,
  fontFamily: 'var(--font-geist-mono, monospace)',
}

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [savedContracts, setSavedContracts] = useState<SavedContract[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalState>(blankModal)
  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<string | null>(null)
  const [generatedTitle, setGeneratedTitle] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([loadProposals(), loadSavedContracts()])
  }, [])

  async function loadProposals() {
    try {
      const res = await fetch('/api/documents/generate')
      const data = await res.json()
      setProposals(data.documents ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function loadSavedContracts() {
    try {
      const res = await fetch('/api/contracts/saved')
      const data = await res.json()
      setSavedContracts(data.contracts ?? [])
    } catch { /* non-critical */ }
  }

  function openBlank() {
    setModal({ ...blankModal, open: true })
    setGeneratedContent(null)
    setError('')
  }

  function openFromContract(c: SavedContract) {
    setModal({
      open: true,
      noticeId: c.samNoticeId ?? c.contractId,
      contractTitle: c.title,
      agencyName: c.agency,
      solicitationNumber: '',
      issuingOffice: '',
      responseDeadline: c.deadline ? new Date(c.deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
      estimatedValue: '',
      placeOfPerformance: '',
    })
    setGeneratedContent(null)
    setError('')
  }

  function closeModal() {
    setModal(blankModal)
    setGeneratedContent(null)
    setError('')
    loadProposals()
  }

  function set(key: keyof ModalState, val: string) {
    setModal((m) => ({ ...m, [key]: val }))
  }

  async function handleGenerate() {
    if (!modal.contractTitle || !modal.agencyName) {
      setError('Contract title and agency name are required.')
      return
    }
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractTitle: modal.contractTitle,
          agencyName: modal.agencyName,
          solicitationNumber: modal.solicitationNumber || undefined,
          issuingOffice: modal.issuingOffice || undefined,
          responseDeadline: modal.responseDeadline || undefined,
          estimatedValue: modal.estimatedValue || undefined,
          placeOfPerformance: modal.placeOfPerformance || undefined,
          noticeId: modal.noticeId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Generation failed'); return }
      setGeneratedContent(data.content)
      setGeneratedTitle(data.document.title)
    } catch {
      setError('Failed to generate proposal.')
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
    a.download = `${generatedTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Group proposals by contract
  const grouped = proposals.reduce<Record<string, Proposal[]>>((acc, p) => {
    const key = p.contractTitle ?? 'Uncategorized'
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

  return (
    <div style={{ padding: '32px 40px', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 10, fontFamily: 'var(--font-geist-mono, monospace)' }}>PROPOSAL SUITE</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.02em', margin: 0, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>Proposals</h1>
          <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', margin: '8px 0 0', fontFamily: 'var(--font-geist-sans, sans-serif)', lineHeight: 1.5 }}>
            Generate a fully structured government contract proposal ready for attorney review.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <button
            onClick={openBlank}
            style={{ padding: '11px 16px', background: 'transparent', color: '#0A0A0A', border: '1px solid rgba(0,0,0,0.12)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)' }}
          >
            QUICK DRAFT
          </button>
          <Link
            href="/proposals/new"
            style={{ padding: '11px 20px', background: '#C41230', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none', fontFamily: 'var(--font-geist-mono, monospace)', display: 'inline-block' }}
          >
            + FULL QUESTIONNAIRE →
          </Link>
        </div>
      </div>

      {/* Saved contracts — quick start */}
      {savedContracts.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 14, fontFamily: 'var(--font-geist-mono, monospace)' }}>GENERATE FROM SAVED CONTRACTS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {savedContracts.map((c) => (
              <div
                key={c.id}
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0A', fontFamily: 'var(--font-geist-sans, sans-serif)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.title}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', marginTop: 3, letterSpacing: '0.04em', fontFamily: 'var(--font-geist-mono, monospace)' }}>
                    {c.agency}{c.deadline ? ` · DUE ${new Date(c.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}` : ''}
                  </div>
                </div>
                <button
                  onClick={() => openFromContract(c)}
                  style={{ padding: '7px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', background: 'transparent', border: '1px solid #C41230', color: '#C41230', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)', flexShrink: 0 }}
                >
                  GENERATE →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Proposals list grouped by contract */}
      <div>
        <div style={{ fontSize: 9, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 16, fontFamily: 'var(--font-geist-mono, monospace)' }}>YOUR PROPOSALS</div>

        {loading ? (
          <div style={{ fontSize: 10, letterSpacing: '0.1em', color: 'rgba(0,0,0,0.2)', fontFamily: 'var(--font-geist-mono, monospace)' }}>LOADING…</div>
        ) : proposals.length === 0 ? (
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.2)', marginBottom: 12, fontFamily: 'var(--font-geist-mono, monospace)' }}>NO PROPOSALS YET</div>
            <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', margin: '0 0 20px', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
              Generate your first proposal from a saved contract or click New Proposal.
            </p>
            <button
              onClick={openBlank}
              style={{ padding: '10px 20px', background: '#C41230', color: '#fff', border: 'none', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)' }}
            >
              + NEW PROPOSAL
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {Object.entries(grouped).map(([contractTitle, group]) => (
              <div key={contractTitle}>
                {/* Contract header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.1em', color: 'rgba(0,0,0,0.3)', fontFamily: 'var(--font-geist-mono, monospace)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 420 }}>
                    {contractTitle}
                  </div>
                  {group[0].agencyName && (
                    <>
                      <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(0,0,0,0.15)', flexShrink: 0 }} />
                      <div style={{ fontSize: 9, letterSpacing: '0.1em', color: 'rgba(0,0,0,0.2)', fontFamily: 'var(--font-geist-mono, monospace)' }}>{group[0].agencyName}</div>
                    </>
                  )}
                </div>

                {/* Proposals under this contract */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {group.map((p) => (
                    <ProposalRow key={p.id} proposal={p} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.1)', width: '100%', maxWidth: 600, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#C41230', fontFamily: 'var(--font-geist-mono, monospace)' }}>
                {generatedContent ? 'PROPOSAL READY' : 'GENERATE PROPOSAL'}
              </div>
              <button onClick={closeModal} style={{ fontSize: 20, color: 'rgba(0,0,0,0.35)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {/* Modal body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              {!generatedContent ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>CONTRACT / SOLICITATION TITLE <span style={{ color: '#C41230' }}>*</span></label>
                      <input value={modal.contractTitle} onChange={(e) => set('contractTitle', e.target.value)} style={inputStyle} placeholder="Enterprise IT Modernization Services" />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>ISSUING AGENCY <span style={{ color: '#C41230' }}>*</span></label>
                      <input value={modal.agencyName} onChange={(e) => set('agencyName', e.target.value)} style={inputStyle} placeholder="Department of Veterans Affairs" />
                    </div>
                    <div>
                      <label style={labelStyle}>SOLICITATION NUMBER</label>
                      <input value={modal.solicitationNumber} onChange={(e) => set('solicitationNumber', e.target.value)} style={inputStyle} placeholder="36C10B24R0001" />
                    </div>
                    <div>
                      <label style={labelStyle}>RESPONSE DEADLINE</label>
                      <input value={modal.responseDeadline} onChange={(e) => set('responseDeadline', e.target.value)} style={inputStyle} placeholder="August 15, 2026" />
                    </div>
                    <div>
                      <label style={labelStyle}>ISSUING OFFICE</label>
                      <input value={modal.issuingOffice} onChange={(e) => set('issuingOffice', e.target.value)} style={inputStyle} placeholder="Network Contracting Office 4" />
                    </div>
                    <div>
                      <label style={labelStyle}>ESTIMATED VALUE</label>
                      <input value={modal.estimatedValue} onChange={(e) => set('estimatedValue', e.target.value)} style={inputStyle} placeholder="$2.5M" />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>PLACE OF PERFORMANCE</label>
                      <input value={modal.placeOfPerformance} onChange={(e) => set('placeOfPerformance', e.target.value)} style={inputStyle} placeholder="Washington, DC / Remote" />
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', fontSize: 11, color: 'rgba(0,0,0,0.45)', lineHeight: 1.6, fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
                    The generated proposal includes a cover page, executive summary, technical approach, management plan, past performance section, and price cover sheet — structured for attorney review and agency submission.
                  </div>

                  {error && (
                    <div style={{ padding: '10px 12px', background: 'rgba(196,18,48,0.05)', border: '1px solid rgba(196,18,48,0.2)', color: '#C41230', fontSize: 11, fontFamily: 'var(--font-geist-mono, monospace)' }}>{error}</div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: 10, letterSpacing: '0.1em', color: '#16a34a', fontFamily: 'var(--font-geist-mono, monospace)' }}>PROPOSAL GENERATED ✓</span>
                      <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', margin: '4px 0 0', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>
                        Fill in all <strong>[BRACKETED]</strong> fields before submission. Review with counsel.
                      </p>
                    </div>
                    <button
                      onClick={handleDownload}
                      style={{ padding: '8px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', background: '#C41230', color: '#ffffff', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)', flexShrink: 0 }}
                    >
                      ↓ DOWNLOAD .TXT
                    </button>
                  </div>
                  <pre style={{ background: '#F8F8F7', border: '1px solid rgba(0,0,0,0.08)', padding: 16, fontSize: 11, color: 'rgba(0,0,0,0.7)', whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: 420, fontFamily: 'var(--font-geist-mono, monospace)', lineHeight: 1.7, margin: 0 }}>
                    {generatedContent}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 24px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
              <button onClick={closeModal} style={{ padding: '9px 16px', fontSize: 10, letterSpacing: '0.08em', background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.45)', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)' }}>
                {generatedContent ? 'CLOSE' : 'CANCEL'}
              </button>
              {!generatedContent && (
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  style={{ padding: '9px 20px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', background: '#C41230', color: '#ffffff', border: 'none', cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.6 : 1, fontFamily: 'var(--font-geist-mono, monospace)' }}
                >
                  {generating ? 'GENERATING…' : 'GENERATE PROPOSAL →'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProposalRow({ proposal }: { proposal: Proposal }) {
  const [expanded, setExpanded] = useState(false)
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleView() {
    if (expanded) { setExpanded(false); return }
    if (content) { setExpanded(true); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/documents/${proposal.id}`)
      const data = await res.json()
      setContent(data.content)
      setExpanded(true)
    } finally {
      setLoading(false)
    }
  }

  function handleDownload() {
    if (!content) return
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${proposal.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)' }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: '#0A0A0A', fontFamily: 'var(--font-geist-sans, sans-serif)' }}>{proposal.title}</div>
          <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.25)', marginTop: 3, letterSpacing: '0.06em', fontFamily: 'var(--font-geist-mono, monospace)' }}>
            {new Date(proposal.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {content && (
            <button onClick={handleDownload} style={{ padding: '6px 12px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', background: 'transparent', border: '1px solid rgba(0,0,0,0.12)', color: 'rgba(0,0,0,0.45)', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)' }}>
              ↓ DOWNLOAD
            </button>
          )}
          <button onClick={handleView} style={{ padding: '6px 12px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', background: 'transparent', border: '1px solid rgba(0,0,0,0.12)', color: '#0A0A0A', cursor: 'pointer', fontFamily: 'var(--font-geist-mono, monospace)' }}>
            {loading ? '…' : expanded ? 'COLLAPSE' : 'VIEW'}
          </button>
        </div>
      </div>
      {expanded && content && (
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '0 16px 16px' }}>
          <pre style={{ background: '#F8F8F7', border: '1px solid rgba(0,0,0,0.06)', padding: 14, fontSize: 10, color: 'rgba(0,0,0,0.65)', whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: 400, fontFamily: 'var(--font-geist-mono, monospace)', lineHeight: 1.7, margin: '12px 0 0' }}>
            {content}
          </pre>
        </div>
      )}
    </div>
  )
}
