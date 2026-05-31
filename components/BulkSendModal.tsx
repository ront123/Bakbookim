'use client'

import { useState } from 'react'
import { Send, SkipForward, X, Check } from 'lucide-react'

type Order = {
  id: string; order_number: string; customer_name: string; phone: string
  items: { name: string; qty: string | number }[]
  raw_row: Record<string, any>
  whatsapp_sent: boolean; whatsapp_sent_at: string | null
  delivered: boolean; delivered_at: string | null; created_at: string
}
type Settings = { senderName: string; projectName: string; city: string; pickupAddress: string; calendarLink: string; messageTemplate: string }

interface Props {
  orders: Order[]
  settings: Settings
  buildMessage: (order: Order, settings: Settings) => string
  onSent: (order: Order) => Promise<void>
  onClose: () => void
}

export default function BulkSendModal({ orders, settings, buildMessage, onSent, onClose }: Props) {
  const [step, setStep]   = useState(0)
  const [done, setDone]   = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const current = orders[step]
  const isLast  = step >= orders.length

  async function handleSend() {
    if (!current) return
    setLoading(true)
    const msg = buildMessage(current, settings)
    const phone = current.phone
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
    await onSent(current)
    setDone(prev => new Set([...prev, current.id]))
    setLoading(false)
    setStep(s => s + 1)
  }

  function handleSkip() {
    setStep(s => s + 1)
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
      }}
      className="animate-fade-in"
    >
      <div className="glass" onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 520, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h3 style={{ fontWeight: 600 }}>שליחה מרובה</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginTop: '2px' }}>
              {isLast ? '✓ הושלם' : `הודעה ${step + 1} מתוך ${orders.length}`}
            </p>
          </div>
          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 100, height: 6, borderRadius: 3, background: 'var(--color-border)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                width: `${(step / orders.length) * 100}%`,
                background: 'linear-gradient(90deg, #7c3aed, #25d366)',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {isLast ? (
          /* Done state */
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(16,185,129,0.15)', margin: '0 auto 1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Check size={28} style={{ color: '#10b981' }} />
            </div>
            <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>הכל נשלח!</p>
            <p style={{ color: 'var(--color-text-dim)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              {done.size} מתוך {orders.length} הודעות נשלחו
            </p>
            <button onClick={onClose} style={{
              padding: '0.6rem 1.5rem', borderRadius: '8px',
              background: 'var(--color-accent)', border: 'none',
              color: 'white', cursor: 'pointer', fontWeight: 600,
              fontSize: '0.9rem', fontFamily: 'inherit',
            }}>
              סגור
            </button>
          </div>
        ) : (
          <>
            {/* Recipient */}
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #7c3aed, #9b1d42)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, color: 'white', fontSize: '1rem',
                }}>
                  {(current.customer_name || '?').charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{current.customer_name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', direction: 'ltr', textAlign: 'right' }}>
                    {current.phone ? `0${current.phone.replace(/^972/, '')}` : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Message preview */}
            <div style={{ padding: '1rem 1.25rem', background: '#0a1a12', maxHeight: 260, overflowY: 'auto' }}>
              <div style={{
                background: '#1e4a2a', borderRadius: '12px 0 12px 12px',
                padding: '0.75rem 1rem', maxWidth: '90%', marginLeft: 'auto',
              }}>
                <pre style={{
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  fontFamily: 'inherit', fontSize: '0.82rem', lineHeight: 1.6,
                  color: '#e8f5e9', margin: 0,
                }}>
                  {buildMessage(current, settings)}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '1rem 1.25rem', borderTop: '1px solid var(--color-border)',
              display: 'flex', gap: '0.75rem',
            }}>
              <button onClick={handleSkip} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.55rem 1rem', borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)',
                color: 'var(--color-text-dim)', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'inherit',
              }}>
                <SkipForward size={15} /> דלג
              </button>
              <button onClick={handleSend} disabled={loading} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '0.55rem 1rem', borderRadius: '8px',
                background: 'linear-gradient(135deg, #25d366, #128c7e)',
                border: 'none', color: 'white', cursor: 'pointer',
                fontSize: '0.875rem', fontWeight: 600, fontFamily: 'inherit',
              }}>
                <Send size={15} />
                שלח ב-WhatsApp
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
