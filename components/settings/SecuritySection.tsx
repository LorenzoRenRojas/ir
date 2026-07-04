'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'

const mono = 'var(--font-geist-mono, monospace)'
const sans = 'var(--font-geist-sans, sans-serif)'
const crimson = '#C41230'

const label: React.CSSProperties = { fontSize: 9, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.35)', fontFamily: mono, display: 'block', marginBottom: 6 }
const input: React.CSSProperties = { width: '100%', padding: '10px 12px', fontSize: 13, fontFamily: sans, border: '1px solid rgba(0,0,0,0.12)', background: '#fff', color: '#0A0A0A', outline: 'none', boxSizing: 'border-box' }

export default function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [pwBusy, setPwBusy] = useState(false)

  const [showDelete, setShowDelete] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [delMsg, setDelMsg] = useState('')
  const [delBusy, setDelBusy] = useState(false)

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwBusy(true)
    setPwMsg('')
    try {
      const res = await fetch('/api/settings/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        setPwMsg('Password updated ✓')
        setCurrentPassword(''); setNewPassword('')
      } else {
        setPwMsg(data.error ?? 'Update failed.')
      }
    } catch {
      setPwMsg('Network error.')
    } finally {
      setPwBusy(false)
    }
  }

  async function handleDelete() {
    setDelBusy(true)
    setDelMsg('')
    try {
      const res = await fetch('/api/settings/security', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: confirmText, password: deletePassword || undefined }),
      })
      const data = await res.json()
      if (res.ok) {
        await signOut({ callbackUrl: '/' })
      } else {
        setDelMsg(data.error ?? 'Deletion failed.')
      }
    } catch {
      setDelMsg('Network error.')
    } finally {
      setDelBusy(false)
    }
  }

  return (
    <div style={{ marginTop: 32 }}>
      {/* Change password */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', padding: 28, marginBottom: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(0,0,0,0.25)', fontFamily: mono, marginBottom: 20 }}>SECURITY</div>
        <form onSubmit={handlePasswordChange} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, alignItems: 'end' }}>
          <div>
            <label style={label}>CURRENT PASSWORD</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} style={input} autoComplete="current-password" placeholder="Leave blank if Google-only account" />
          </div>
          <div>
            <label style={label}>NEW PASSWORD (MIN 8 CHARS)</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={input} autoComplete="new-password" required minLength={8} />
          </div>
          <button type="submit" disabled={pwBusy || newPassword.length < 8} style={{ padding: '11px 20px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', background: '#0A0A0A', color: '#fff', border: 'none', cursor: pwBusy ? 'not-allowed' : 'pointer', fontFamily: mono, opacity: pwBusy || newPassword.length < 8 ? 0.5 : 1 }}>
            {pwBusy ? 'UPDATING…' : 'UPDATE PASSWORD'}
          </button>
        </form>
        {pwMsg && <div style={{ marginTop: 12, fontSize: 11, fontFamily: mono, color: pwMsg.endsWith('✓') ? '#16a34a' : crimson }}>{pwMsg}</div>}
      </div>

      {/* Danger zone */}
      <div style={{ background: '#fff', border: '1px solid rgba(196,18,48,0.25)', padding: 28 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: crimson, fontFamily: mono, marginBottom: 12 }}>DANGER ZONE</div>
        {!showDelete ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', fontFamily: sans, margin: 0, lineHeight: 1.6 }}>
              Permanently delete your account, company profile, pipeline, and all generated proposals. This cannot be undone.
            </p>
            <button onClick={() => setShowDelete(true)} style={{ padding: '10px 18px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', background: 'transparent', color: crimson, border: `1px solid ${crimson}`, cursor: 'pointer', fontFamily: mono }}>
              DELETE ACCOUNT…
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 420 }}>
            <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)', fontFamily: sans, margin: 0, lineHeight: 1.6 }}>
              This erases everything — profile, pipeline, notes, proposals. Type <strong>DELETE</strong> to confirm.
            </p>
            <input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="Type DELETE" style={input} />
            <input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} placeholder="Your password (skip if Google-only account)" style={input} autoComplete="current-password" />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleDelete} disabled={delBusy || confirmText !== 'DELETE'} style={{ padding: '11px 20px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', background: crimson, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: mono, opacity: delBusy || confirmText !== 'DELETE' ? 0.5 : 1 }}>
                {delBusy ? 'DELETING…' : 'PERMANENTLY DELETE'}
              </button>
              <button onClick={() => { setShowDelete(false); setConfirmText(''); setDelMsg('') }} style={{ padding: '11px 20px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', background: 'transparent', color: 'rgba(0,0,0,0.45)', border: '1px solid rgba(0,0,0,0.12)', cursor: 'pointer', fontFamily: mono }}>
                CANCEL
              </button>
            </div>
            {delMsg && <div style={{ fontSize: 11, fontFamily: mono, color: crimson }}>{delMsg}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
