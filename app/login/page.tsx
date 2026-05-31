'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Wine, Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('אימייל או סיסמה שגויים')
      setLoading(false)
    } else {
      window.location.href = '/'
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 60% 20%, rgba(124,58,237,0.12) 0%, transparent 60%), var(--color-bg)',
      padding: '1.5rem',
    }}>
      {/* Card */}
      <div className="glass animate-fade-in" style={{ width: '100%', maxWidth: 420, padding: '2.5rem 2rem' }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem', gap: '0.75rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c3aed, #9b1d42)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 32px rgba(124,58,237,0.4)',
          }}>
            <Wine size={30} color="white" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Bakbokim</h1>
            <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
              ניהול הזמנות יין
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', fontWeight: 500 }}>אימייל</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{
                position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)',
              }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                dir="ltr"
                style={{
                  width: '100%', padding: '0.7rem 2.5rem 0.7rem 0.9rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '10px', color: 'var(--color-text)',
                  fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s',
                  fontFamily: 'inherit',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--color-accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', fontWeight: 500 }}>סיסמה</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{
                position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)',
              }} />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                dir="ltr"
                style={{
                  width: '100%', padding: '0.7rem 2.5rem 0.7rem 2.5rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '10px', color: 'var(--color-text)',
                  fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s',
                  fontFamily: 'inherit',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--color-accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                style={{
                  position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)',
                  display: 'flex', alignItems: 'center',
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px', padding: '0.6rem 0.9rem',
              color: '#f87171', fontSize: '0.875rem', textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.5rem', padding: '0.8rem',
              background: loading ? 'var(--color-border)' : 'linear-gradient(135deg, #7c3aed, #9b1d42)',
              border: 'none', borderRadius: '10px', color: 'white',
              fontSize: '1rem', fontWeight: 600, cursor: loading ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              transition: 'opacity 0.2s, transform 0.1s',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(124,58,237,0.35)',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { if (!loading) (e.currentTarget.style.opacity = '0.9') }}
            onMouseLeave={e => { (e.currentTarget.style.opacity = '1') }}
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? 'מתחבר...' : 'כניסה'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          אין לך חשבון? פנה למנהל המערכת
        </p>
      </div>
    </div>
  )
}
