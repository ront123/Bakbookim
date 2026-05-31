'use client'

import { useState, useEffect } from 'react'
import { Save, RotateCcw, Link, User, MapPin, MessageSquare, Loader2, Check, Wine } from 'lucide-react'

const DEFAULT_TEMPLATE = `Hello {{name}}
This is {{senderName}} from *Bakbokim Project* in {{city}}. Your order {{orderNum}} is ready for collection!

*Order Summary:*
{{items}}

Pickup slot: {{calendarLink}}

*Pickup Address:* _{{address}}, {{city}}_

---
שלום {{name}}
{{senderName}} מ-*פרויקט בקבוקים* ב{{city}} כאן. ההזמנה שלך מספר {{orderNum}} מוכנה לאיסוף!

*פירוט ההזמנה:*
{{items}}

ניתן לקבוע מועד איסוף: {{calendarLink}}

*כתובת לאיסוף:* _{{address}}, {{city}}_`

const VARS = ['{{name}}', '{{orderNum}}', '{{senderName}}', '{{projectName}}', '{{city}}', '{{items}}', '{{calendarLink}}', '{{address}}']

export default function SettingsPage() {
  const [form, setForm] = useState({
    senderName: '', projectName: '', city: '', pickupAddress: '',
    calendarLink: '', wineSearchUrl: '', messageTemplate: '',
  })
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setForm({
          senderName:      data.senderName      || 'רון',
          projectName:     data.projectName     || 'Bakbokim Project',
          city:            data.city            || 'נתניה',
          pickupAddress:   data.pickupAddress   || '',
          calendarLink:    data.calendarLink    || '',
          wineSearchUrl:   data.wineSearchUrl   || '',
          messageTemplate: data.messageTemplate || DEFAULT_TEMPLATE,
        })
        setLoading(false)
      })
  }, [])

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function save() {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function insertVar(token: string) {
    const ta = document.getElementById('messageTemplate') as HTMLTextAreaElement
    if (!ta) return
    const pos = ta.selectionStart
    const newVal = ta.value.slice(0, pos) + token + ta.value.slice(ta.selectionEnd)
    set('messageTemplate', newVal)
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = pos + token.length
      ta.focus()
    }, 0)
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 800 }}>
      {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 14 }} />)}
    </div>
  )

  return (
    <div style={{ maxWidth: 800, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>הגדרות</h1>
        <p style={{ color: 'var(--color-text-dim)', marginTop: '0.2rem', fontSize: '0.9rem' }}>
          התאם את פרטי השולח, חיפוש תמונות יין, ותבנית ההודעה
        </p>
      </div>

      {/* Sender info */}
      <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={16} style={{ color: 'var(--color-accent-light)' }} />
          </div>
          <div>
            <h2 style={{ fontWeight: 600, fontSize: '0.95rem' }}>פרטי השולח</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)' }}>יופיעו בכל הודעת WhatsApp</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {[
            { key: 'senderName',    label: 'שם השולח',       placeholder: 'רון' },
            { key: 'projectName',   label: 'שם הפרויקט',     placeholder: 'Bakbokim Project' },
            { key: 'city',          label: 'עיר',            placeholder: 'נתניה' },
            { key: 'pickupAddress', label: 'כתובת איסוף',    placeholder: 'סמילנסקי 79' },
          ].map(({ key, label, placeholder }) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', fontWeight: 500 }}>{label}</label>
              <input
                value={form[key as keyof typeof form]}
                onChange={e => set(key, e.target.value)}
                placeholder={placeholder}
                style={{
                  padding: '0.6rem 0.85rem', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)',
                  color: 'var(--color-text)', fontSize: '0.9rem', outline: 'none',
                  fontFamily: 'inherit', transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
              />
            </div>
          ))}
        </div>

        {/* Calendar link full-width */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Link size={12} /> קישור לתיאום איסוף
          </label>
          <input
            value={form.calendarLink}
            onChange={e => set('calendarLink', e.target.value)}
            placeholder="https://calendar.app.google/..."
            dir="ltr"
            style={{
              padding: '0.6rem 0.85rem', borderRadius: '8px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)',
              color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none',
              fontFamily: 'monospace', transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
          />
        </div>
      </div>

      {/* Wine image URL */}
      <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(155,29,66,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wine size={16} style={{ color: '#c23a62' }} />
          </div>
          <div>
            <h2 style={{ fontWeight: 600, fontSize: '0.95rem' }}>חיפוש תמונות יין</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)' }}>
              URL מותאם → Vivino → חיפוש ברשת
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', fontWeight: 500 }}>
            URL אתר ספק (אופציונלי)
          </label>
          <input
            value={form.wineSearchUrl}
            onChange={e => set('wineSearchUrl', e.target.value)}
            placeholder="https://example-wine-shop.co.il"
            dir="ltr"
            style={{
              padding: '0.6rem 0.85rem', borderRadius: '8px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)',
              color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none',
              fontFamily: 'monospace', transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = '#c23a62'}
            onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            אם ריק — המערכת תחפש ב-Vivino וברשת אוטומטית
          </p>
        </div>
      </div>

      {/* Message template */}
      <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37,211,102,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={16} style={{ color: '#25d366' }} />
          </div>
          <div>
            <h2 style={{ fontWeight: 600, fontSize: '0.95rem' }}>תבנית הודעה</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)' }}>ערוך את תוכן הודעות WhatsApp</p>
          </div>
        </div>

        {/* Variable chips */}
        <div>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)', marginBottom: '0.5rem' }}>לחץ להכנסת משתנה:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {VARS.map(v => (
              <button key={v} onClick={() => insertVar(v)}
                style={{
                  padding: '0.25rem 0.65rem', borderRadius: '100px', fontSize: '0.75rem',
                  background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)',
                  color: 'var(--color-accent-light)', cursor: 'pointer', fontFamily: 'monospace',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(124,58,237,0.12)'}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <textarea
          id="messageTemplate"
          value={form.messageTemplate}
          onChange={e => set('messageTemplate', e.target.value)}
          rows={14}
          spellCheck={false}
          style={{
            padding: '0.85rem', borderRadius: '10px', resize: 'vertical',
            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)',
            color: 'var(--color-text)', fontSize: '0.875rem', lineHeight: 1.7,
            outline: 'none', fontFamily: 'monospace', width: '100%',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
        />

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-start' }}>
          <button onClick={() => set('messageTemplate', DEFAULT_TEMPLATE)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.55rem 1rem', borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)',
              color: 'var(--color-text-dim)', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'inherit',
            }}>
            <RotateCcw size={14} /> ברירת מחדל
          </button>
          <button onClick={save} disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.55rem 1.25rem', borderRadius: '8px',
              background: saved ? 'rgba(16,185,129,0.2)' : 'linear-gradient(135deg, #7c3aed, #9b1d42)',
              border: saved ? '1px solid rgba(16,185,129,0.4)' : 'none',
              color: saved ? '#10b981' : 'white',
              cursor: saving ? 'default' : 'pointer',
              fontSize: '0.875rem', fontWeight: 600, fontFamily: 'inherit',
              boxShadow: saved ? 'none' : '0 4px 14px rgba(124,58,237,0.3)',
              transition: 'all 0.3s',
            }}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}
            {saving ? 'שומר...' : saved ? 'נשמר!' : 'שמור הגדרות'}
          </button>
        </div>
      </div>
    </div>
  )
}
