'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Wine, ClipboardList, Settings, LogOut } from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const navItems = [
    { href: '/',          label: 'הזמנות',   Icon: ClipboardList },
    { href: '/settings',  label: 'הגדרות',   Icon: Settings },
  ]

  return (
    <aside style={{
      width: 220, minHeight: '100vh', flexShrink: 0,
      background: 'var(--color-surface)',
      borderLeft: '1px solid var(--color-border)',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh',
    }}>
      {/* Logo */}
      <div style={{
        padding: '1.5rem 1.25rem',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: '10px',
          background: 'linear-gradient(135deg, #7c3aed, #9b1d42)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 16px rgba(124,58,237,0.4)',
          flexShrink: 0,
        }}>
          <Wine size={20} color="white" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>Bakbokim</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '1px' }}>v2.0</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '0.75rem 0.625rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.65rem',
                padding: '0.6rem 0.85rem', borderRadius: '10px',
                textDecoration: 'none', fontSize: '0.9rem', fontWeight: active ? 600 : 400,
                color: active ? 'white' : 'var(--color-text-dim)',
                background: active ? 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(155,29,66,0.2))' : 'transparent',
                border: active ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={17} style={{ opacity: active ? 1 : 0.7 }} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: '0.75rem 0.625rem', borderTop: '1px solid var(--color-border)' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem',
            padding: '0.6rem 0.85rem', borderRadius: '10px',
            background: 'none', border: '1px solid transparent',
            color: 'var(--color-text-dim)', cursor: 'pointer', fontSize: '0.9rem',
            transition: 'all 0.15s', fontFamily: 'inherit',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
            e.currentTarget.style.color = '#f87171'
            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'none'
            e.currentTarget.style.color = 'var(--color-text-dim)'
            e.currentTarget.style.borderColor = 'transparent'
          }}
        >
          <LogOut size={17} />
          התנתק
        </button>
      </div>
    </aside>
  )
}
