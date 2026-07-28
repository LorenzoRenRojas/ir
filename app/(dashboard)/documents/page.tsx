'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import DocEditor from '@/components/DocEditor'
import { downloadHtmlAsPdf, downloadTextAsPdf } from '@/lib/pdf'

const slug = (s: string) => s.replace(/[^a-z0-9]/gi, '-').toLowerCase()
const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

// New documents are generated as HTML; a few legacy docs may be plain text.
const looksLikeHtml = (s: string) => /^\s*</.test(s)
async function exportPdf(title: string, content: string, filename: string) {
  if (looksLikeHtml(content)) await downloadHtmlAsPdf(title, content, filename)
  else await downloadTextAsPdf(title, content, filename)
}

interface Doc {
  id: string
  type: string
  title: string
  contractTitle: string | null
  agencyName: string | null
  noticeId: string | null
  createdAt: string
}

type Editing = { id: string; title: string; html: string }

// The document types the suite can generate. Each is pre-filled from the
// company profile; guided types ask only the notice-specific fields.
type Field = { key: string; label: string; required?: boolean; placeholder?: string; textarea?: boolean }
const GUIDED: Record<string, { title: string; fields: Field[] }> = {
  sources_sought: {
    title: 'Sources Sought Response',
    fields: [
      { key: 'noticeTitle', label: 'NOTICE TITLE', required: true, placeholder: 'Enterprise IT Support Services' },
      { key: 'agencyName', label: 'AGENCY', required: true, placeholder: 'Department of Veterans Affairs' },
      { key: 'solicitationNumber', label: 'NOTICE / REFERENCE NO.', placeholder: '36C10B24R0001' },
      { key: 'requirementSummary', label: 'HOW YOU MEET THE NEED (optional)', textarea: true, placeholder: 'Two or three sentences on the specific capability, systems, or experience you bring to this requirement.' },
    ],
  },
  cover_letter: {
    title: 'Cover Letter',
    fields: [
      { key: 'contractTitle', label: 'CONTRACT TITLE', required: true, placeholder: 'Enterprise IT Support Services' },
      { key: 'agencyName', label: 'AGENCY', required: true, placeholder: 'Department of Veterans Affairs' },
      { key: 'solicitationNumber', label: 'SOLICITATION NUMBER', placeholder: '36C10B24R0001' },
      { key: 'officerName', label: 'CONTRACTING OFFICER NAME', placeholder: 'Jane Smith' },
    ],
  },
}

const DOC_TYPES: { key: string; name: string; desc: string; mode: 'oneclick' | 'link' | 'guided' | 'soon'; href?: string }[] = [
  { key: 'capability', name: 'Capability Statement', desc: 'One-page company overview government buyers scan in seconds.', mode: 'oneclick' },
  { key: 'proposal', name: 'Full Proposal', desc: 'Guided four-volume federal proposal, ready to submit.', mode: 'link', href: '/proposals/new' },
  { key: 'sources_sought', name: 'Sources Sought Response', desc: 'Get on the agency’s radar before the RFP exists.', mode: 'guided' },
  { key: 'cover_letter', name: 'Cover Letter', desc: 'A sharp letter of interest for any submission.', mode: 'guided' },
  { key: 'past_performance', name: 'Past Performance Sheet', desc: 'Your reference table of similar contracts.', mode: 'soon' },
]

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', background: '#F8F8F7',
  border: '1px solid rgba(0,0,0,0.1)', color: '#0A0A0A', fontSize: 13,
  fontFamily: sans, outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
  color: 'rgba(0,0,0,0.35)', marginBottom: 8, fontFamily: mono,
}

export default function DocumentSuitePage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')          // which doc-type card is generating
  const [error, setError] = useState('')
  const [modalType, setModalType] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<Editing | null>(null)

  useEffect(() => { loadDocs() }, [])

  async function loadDocs() {
    try {
      const res = await fetch('/api/documents/generate')
      const data = await res.json()
      setDocs(data.documents ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function generateCapability() {
    setBusy('capability'); setError('')
    try {
      const res = await fetch('/api/documents/capability-statement', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Generation failed.'); return }
      setEditing({ id: data.id, title: data.title, html: data.content })
      loadDocs()
    } catch {
      setError('Failed to generate. Try again.')
    } finally {
      setBusy('')
    }
  }

  function openGuided(type: string) {
    setModalType(type); setFields({}); setError('')
  }

  async function submitGuided() {
    if (!modalType) return
    const cfg = GUIDED[modalType]
    for (const f of cfg.fields) {
      if (f.required && !fields[f.key]?.trim()) { setError(`${f.label.replace(' (optional)', '')} is required.`); return }
    }
    setBusy(modalType); setError('')
    try {
      const res = await fetch('/api/documents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docType: modalType, ...fields }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Generation failed.'); return }
      setModalType(null)
      setEditing({ id: data.id, title: data.title, html: data.content })
      loadDocs()
    } catch {
      setError('Failed to generate. Try again.')
    } finally {
      setBusy('')
    }
  }

  async function openEditor(doc: Doc) {
    setError('')
    try {
      const res = await fetch(`/api/documents/${doc.id}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Could not open document.'); return }
      setEditing({ id: doc.id, title: doc.title, html: data.content ?? '' })
    } catch {
      setError('Could not open document. Try again.')
    }
  }

  async function deleteDoc(id: string) {
    if (!window.confirm('Delete this document? This cannot be undone.')) return
    await fetch(`/api/documents/${id}`, { method: 'DELETE' })
    loadDocs()
  }

  async function clearAll() {
    if (docs.length === 0) return
    if (!window.confirm(`Delete all ${docs.length} generated documents? This cannot be undone.`)) return
    setBusy('clear')
    try {
      await Promise.all(docs.map((d) => fetch(`/api/documents/${d.id}`, { method: 'DELETE' })))
      loadDocs()
    } finally {
      setBusy('')
    }
  }

  return (
    <div style={{ padding: '32px 40px', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 10, fontFamily: mono }}>DOCUMENT SUITE</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.02em', margin: 0, fontFamily: sans }}>Documents</h1>
          <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', margin: '8px 0 0', maxWidth: 560, fontFamily: sans, lineHeight: 1.5 }}>
            Every document a bid needs — pre-filled from your company profile, edited right here in the suite, exported as PDF. Review with counsel before submission.
          </p>
        </div>
        {docs.length > 0 && (
          <button onClick={clearAll} disabled={!!busy} style={{ padding: '9px 14px', background: 'transparent', color: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,0,0,0.12)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: mono, flexShrink: 0 }}>
            {busy === 'clear' ? 'CLEARING…' : `CLEAR ALL (${docs.length})`}
          </button>
        )}
      </div>

      {error && (
        <div style={{ marginBottom: 20, padding: '10px 16px', border: '1px solid rgba(196,18,48,0.3)', background: 'rgba(196,18,48,0.04)', fontSize: 12, color: crimson, fontFamily: sans }}>
          {error}
        </div>
      )}

      {/* Generate a document */}
      <div style={{ fontSize: 9, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 14, fontFamily: mono }}>GENERATE A DOCUMENT</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 40 }}>
        {DOC_TYPES.map((d) => {
          const generating = busy === d.key
          const soon = d.mode === 'soon'
          const card = (
            <div style={{ background: soon ? 'rgba(0,0,0,0.02)' : '#FFFFFF', border: soon ? '1px dashed rgba(0,0,0,0.14)' : '1px solid rgba(0,0,0,0.08)', padding: '20px 20px', height: '100%', display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
              {soon && <span style={{ position: 'absolute', top: 14, right: 14, fontSize: 7.5, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.35)', border: '1px solid rgba(0,0,0,0.15)', padding: '3px 6px', fontFamily: mono }}>COMING SOON</span>}
              <div style={{ fontSize: 13, fontWeight: 700, color: soon ? 'rgba(0,0,0,0.4)' : '#0A0A0A', fontFamily: sans }}>{d.name}</div>
              <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,0.42)', fontFamily: sans, lineHeight: 1.5, flex: 1 }}>{d.desc}</div>
              {!soon && (
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: crimson, fontFamily: mono, marginTop: 4 }}>
                  {generating ? 'GENERATING…' : d.mode === 'link' ? 'OPEN →' : 'GENERATE →'}
                </div>
              )}
            </div>
          )
          if (soon) return <div key={d.key}>{card}</div>
          if (d.mode === 'link') return <Link key={d.key} href={d.href!} style={{ textDecoration: 'none' }}>{card}</Link>
          return (
            <button
              key={d.key}
              onClick={() => (d.mode === 'oneclick' ? generateCapability() : openGuided(d.key))}
              disabled={!!busy}
              style={{ padding: 0, border: 'none', background: 'transparent', cursor: busy ? 'not-allowed' : 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
            >
              {card}
            </button>
          )
        })}
      </div>

      {/* Your documents */}
      <div style={{ fontSize: 9, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', marginBottom: 16, fontFamily: mono }}>YOUR DOCUMENTS</div>
      {loading ? (
        <div style={{ fontSize: 10, letterSpacing: '0.1em', color: 'rgba(0,0,0,0.2)', fontFamily: mono }}>LOADING…</div>
      ) : docs.length === 0 ? (
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 9, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.2)', marginBottom: 10, fontFamily: mono }}>NO DOCUMENTS YET</div>
          <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', margin: 0, fontFamily: sans }}>Generate one above — it opens in the editor and saves here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {docs.map((d) => <DocRow key={d.id} doc={d} onEdit={() => openEditor(d)} onDelete={() => deleteDoc(d.id)} />)}
        </div>
      )}

      {/* Guided modal */}
      {modalType && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.1)', width: '100%', maxWidth: 560, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: crimson, fontFamily: mono }}>{GUIDED[modalType].title.toUpperCase()}</div>
              <button onClick={() => setModalType(null)} style={{ fontSize: 20, color: 'rgba(0,0,0,0.35)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {GUIDED[modalType].fields.map((f) => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}{f.required && <span style={{ color: crimson }}> *</span>}</label>
                  {f.textarea ? (
                    <textarea value={fields[f.key] ?? ''} onChange={(e) => setFields((s) => ({ ...s, [f.key]: e.target.value }))} style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} placeholder={f.placeholder} />
                  ) : (
                    <input value={fields[f.key] ?? ''} onChange={(e) => setFields((s) => ({ ...s, [f.key]: e.target.value }))} style={inputStyle} placeholder={f.placeholder} />
                  )}
                </div>
              ))}
              <div style={{ padding: '11px 13px', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', fontSize: 11, color: 'rgba(0,0,0,0.45)', lineHeight: 1.6, fontFamily: sans }}>
                Pre-filled from your company profile. The draft opens in the editor — fill any <strong>[bracketed]</strong> fields, then export a PDF. Review with counsel before submission.
              </div>
              {error && <div style={{ padding: '10px 12px', background: 'rgba(196,18,48,0.05)', border: '1px solid rgba(196,18,48,0.2)', color: crimson, fontSize: 11, fontFamily: mono }}>{error}</div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 24px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
              <button onClick={() => setModalType(null)} style={{ padding: '9px 16px', fontSize: 10, letterSpacing: '0.08em', background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.45)', cursor: 'pointer', fontFamily: mono }}>CANCEL</button>
              <button onClick={submitGuided} disabled={!!busy} style={{ padding: '9px 20px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', background: crimson, color: '#fff', border: 'none', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: mono }}>
                {busy === modalType ? 'GENERATING…' : 'OPEN IN EDITOR →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive editor */}
      {editing && (
        <EditorModal
          key={editing.id}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={loadDocs}
        />
      )}
    </div>
  )
}

// Full-screen editor: DocEditor + save (PATCH) + export PDF.
function EditorModal({ editing, onClose, onSaved }: { editing: Editing; onClose: () => void; onSaved: () => void }) {
  const htmlRef = useRef(editing.html)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [dirty, setDirty] = useState(false)

  async function save(): Promise<boolean> {
    setSaving(true); setStatus('')
    try {
      const res = await fetch(`/api/documents/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: htmlRef.current }),
      })
      if (!res.ok) { setStatus('Save failed.'); return false }
      setStatus('SAVED ✓'); setDirty(false); onSaved()
      return true
    } catch {
      setStatus('Network error.'); return false
    } finally {
      setSaving(false)
    }
  }

  async function exportOut() {
    // Persist the latest edits first so the PDF and the saved copy match.
    await save()
    await downloadHtmlAsPdf(editing.title, htmlRef.current, `${slug(editing.title)}.pdf`)
  }

  function requestClose() {
    if (dirty && !window.confirm('Close without saving your latest edits?')) return
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.55)', padding: 16 }}>
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.1)', width: '100%', maxWidth: 900, margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 22px', borderBottom: '1px solid rgba(0,0,0,0.08)', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.3)', fontFamily: mono, marginBottom: 4 }}>EDITING</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: sans, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 460 }}>{editing.title}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {status && <span style={{ fontSize: 9, letterSpacing: '0.06em', color: status.endsWith('✓') ? '#16A34A' : crimson, fontFamily: mono }}>{status}</span>}
            <button onClick={save} disabled={saving} style={{ padding: '8px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', background: 'transparent', border: '1px solid rgba(0,0,0,0.2)', color: '#0A0A0A', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: mono }}>{saving ? 'SAVING…' : 'SAVE'}</button>
            <button onClick={exportOut} disabled={saving} style={{ padding: '8px 18px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', background: crimson, color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: mono }}>↓ EXPORT PDF</button>
            <button onClick={requestClose} title="Close" style={{ fontSize: 22, color: 'rgba(0,0,0,0.4)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: '#E9E8E4', minHeight: 0 }}>
          <DocEditor
            initialHtml={editing.html}
            onChange={(html) => { htmlRef.current = html; setDirty(true); if (status) setStatus('') }}
          />
        </div>
      </div>
    </div>
  )
}

function DocRow({ doc, onEdit, onDelete }: { doc: Doc; onEdit: () => void; onDelete: () => void }) {
  const [downloading, setDownloading] = useState(false)
  const [sendingPO, setSendingPO] = useState(false)
  const [poStatus, setPoStatus] = useState('')

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/documents/${doc.id}`)
      const data = await res.json()
      if (!res.ok || !data.content) return
      await exportPdf(doc.title, data.content, `${slug(doc.title)}.pdf`)
    } finally {
      setDownloading(false)
    }
  }

  async function handleSendToOfficer() {
    setSendingPO(true); setPoStatus('')
    try {
      const preview = await fetch('/api/proposals/send-to-officer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: doc.id, dryRun: true }),
      })
      const pd = await preview.json()
      if (!preview.ok) { setPoStatus(pd.error ?? 'No contracting officer found.'); return }
      if (!window.confirm(`Send "${doc.title}" to the government point of contact?\n\n${pd.contact.name}\n${pd.contact.email}\n\nReplies go to your email. This cannot be undone.`)) return
      const res = await fetch('/api/proposals/send-to-officer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: doc.id }),
      })
      const data = await res.json()
      setPoStatus(res.ok ? `SENT TO ${data.to} ✓` : (data.error ?? 'Send failed.'))
    } catch {
      setPoStatus('Network error.')
    } finally {
      setSendingPO(false)
    }
  }

  const btn: React.CSSProperties = { padding: '6px 12px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', background: 'transparent', border: '1px solid rgba(0,0,0,0.12)', color: 'rgba(0,0,0,0.45)', cursor: 'pointer', fontFamily: mono }

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)' }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: '#0A0A0A', fontFamily: sans, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.title}</div>
          <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.25)', marginTop: 3, letterSpacing: '0.06em', fontFamily: mono }}>
            {doc.type.replace(/_/g, ' ').toUpperCase()} · {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {poStatus && <span style={{ fontSize: 9, letterSpacing: '0.05em', color: poStatus.endsWith('✓') ? '#16A34A' : crimson, fontFamily: mono, maxWidth: 220 }}>{poStatus}</span>}
          {doc.noticeId && !poStatus.endsWith('✓') && (
            <button onClick={handleSendToOfficer} disabled={sendingPO} style={{ ...btn, borderColor: 'rgba(196,18,48,0.35)', color: crimson, opacity: sendingPO ? 0.6 : 1 }}>
              {sendingPO ? 'SENDING…' : 'SEND TO PO →'}
            </button>
          )}
          <button onClick={handleDownload} disabled={downloading} style={btn}>{downloading ? '…' : '↓ PDF'}</button>
          <button onClick={onEdit} style={{ ...btn, borderColor: 'rgba(0,0,0,0.25)', color: '#0A0A0A' }}>EDIT</button>
          <button onClick={onDelete} title="Delete" style={{ ...btn, color: crimson, borderColor: 'rgba(196,18,48,0.25)' }}>✕</button>
        </div>
      </div>
    </div>
  )
}
