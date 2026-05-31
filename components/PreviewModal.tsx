'use client'

import { Send, X, Copy, Check } from 'lucide-react'
import { useState } from 'react'

type Order = {
  id: string; customer_name: string; phone: string
  whatsapp_sent: boolean; delivered: boolean; items: any[]
}

interface Props {
  order: Order
  message: string
  onClose: () => void
  onSend: () => void
}

export default function PreviewModal({ order, message, onClose, onSend }: Props) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
      }}
      className="animate-fade-in"
    >
      <div
        className="glass"
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>תצוגה מקדימה</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginTop: '2px' }}>
              {order.customer_name} · {order.phone ? `0${order.phone.replace(/^972/, '')}` : '—'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
            <X size={20} />
          </button>
        </div>

        {/* WhatsApp bubble */}
        <div style={{ padding: '1.25rem', background: '#0a1a12', flex: 1, overflowY: 'auto' }}>
          <div style={{
            background: '#1e4a2a', borderRadius: '12px 0 12px 12px',
            padding: '0.75rem 1rem', maxWidth: '90%', marginLeft: 'auto',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}>
            <pre style={{
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              fontFamily: 'inherit', fontSize: '0.875rem',
              lineHeight: 1.6, color: '#e8f5e9', margin: 0,
            }}>
              {message}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.25rem', borderTop: '1px solid var(--color-border)',
          display: 'flex', gap: '0.75rem', justifyContent: 'flex-start',
        }}>
          <button onClick={copy} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.55rem 1rem', borderRadius: '8px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)',
            color: 'var(--color-text-dim)', cursor: 'pointer', fontSize: '0.875rem',
            fontFamily: 'inherit', transition: 'all 0.15s',
          }}>
            {copied ? <Check size={15} style={{ color: '#10b981' }} /> : <Copy size={15} />}
            {copied ? 'הועתק!' : 'העתק'}
          </button>
          <button onClick={onSend} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.55rem 1.25rem', borderRadius: '8px',
            background: 'linear-gradient(135deg, #25d366, #128c7e)',
            border: 'none', color: 'white', cursor: 'pointer',
            fontSize: '0.875rem', fontWeight: 600, fontFamily: 'inherit',
            boxShadow: '0 4px 14px rgba(37,211,102,0.3)',
          }}>
            <Send size={15} />
            שלח ב-WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}
