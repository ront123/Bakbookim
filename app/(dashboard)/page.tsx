'use client'

import { useState, useEffect, useCallback } from 'react'
import * as XLSX from 'xlsx'
import {
  Upload, Search, Filter, Send, CheckCircle2, Package,
  Truck, Eye, Loader2, X, ChevronDown, Users, BarChart3,
  ClipboardList, RefreshCw,
} from 'lucide-react'
import WineImage from '@/components/WineImage'
import PreviewModal from '@/components/PreviewModal'
import BulkSendModal from '@/components/BulkSendModal'

// ─── Types ────────────────────────────────────────────────
type Order = {
  id: string
  order_number: string
  customer_name: string
  phone: string
  items: { name: string; qty: string | number }[]
  raw_row: Record<string, any>
  whatsapp_sent: boolean
  whatsapp_sent_at: string | null
  delivered: boolean
  delivered_at: string | null
  created_at: string
}

type Settings = {
  senderName: string; projectName: string; city: string
  pickupAddress: string; calendarLink: string; messageTemplate: string
}

type ImportResult = { added: number; existing: number; errors: number } | null

// ─── Excel parser helpers ──────────────────────────────────
function cleanPhone(raw: string) {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('972')) return digits
  return '972' + digits.replace(/^0/, '').slice(-9)
}

function parseExcel(file: File): Promise<{ rows: any[]; sheetName: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = evt => {
      try {
        const wb = XLSX.read(new Uint8Array(evt.target!.result as ArrayBuffer), { type: 'array' })
        let sheetName = wb.SheetNames[0]
        for (const sn of wb.SheetNames) {
          if (sn.toUpperCase() === 'DATA') { sheetName = sn; break }
        }
        const ws = wb.Sheets[sheetName]
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]
        if (raw.length < 2) { reject(new Error('הגיליון ריק')); return }

        const headers: string[] = raw[0].map((h, i) => String(h || `col_${i}`).trim())

        // Identify key columns
        const phoneCol   = headers.findIndex(h => /phone|mobile|נייד|טלפון/i.test(h))
        const nameCol    = headers.findIndex(h => /shipping.?name|customer.?name|שם.?לקוח/i.test(h))
        const orderCol   = headers.findIndex(h => /^name$/i.test(h) || /order.?num|מספר/i.test(h))
        const excludeCols = new Set(['תוויות שורה','Row Labels','Name','Shipping Name','Customer Name','Billing Phone','Phone','Email','סכום כולל'])

        const rows = raw.slice(1)
          .filter(r => r.some(c => c !== ''))
          .map(r => {
            const obj: Record<string, any> = {}
            headers.forEach((h, i) => { obj[h] = r[i] ?? '' })

            // Normalise phone
            const phoneKey = phoneCol >= 0 ? headers[phoneCol] : Object.keys(obj).find(k => /phone|mobile|נייד|טלפון/i.test(k))
            let phone = ''
            if (phoneKey && obj[phoneKey]) {
              phone = cleanPhone(String(obj[phoneKey]))
            }

            const customerName = nameCol >= 0 ? String(obj[headers[nameCol]] || '') :
              String(obj['Shipping Name'] || obj['Customer Name'] || '')
            const orderNumber = orderCol >= 0 ? String(obj[headers[orderCol]] || '') :
              String(obj['Name'] || '')

            const items = headers
              .filter(h => !excludeCols.has(h))
              .filter(h => obj[h] !== undefined && obj[h] !== '' && obj[h] !== 0 && obj[h] !== '0')
              .map(h => ({ name: h, qty: obj[h] }))

            return { order_number: orderNumber, customer_name: customerName, phone, items, raw_row: obj }
          })

        resolve({ rows, sheetName })
      } catch (e) { reject(e) }
    }
    reader.readAsArrayBuffer(file)
  })
}

// ─── Message builder (mirrors original logic) ─────────────
function buildMessage(order: Order, settings: Settings) {
  const itemLines = order.items.map(it => `${it.name}: ${it.qty}`).join('\n')
  return settings.messageTemplate
    .replace(/{{name}}/g,         order.customer_name)
    .replace(/{{orderNum}}/g,     order.order_number)
    .replace(/{{senderName}}/g,   settings.senderName)
    .replace(/{{projectName}}/g,  settings.projectName)
    .replace(/{{city}}/g,         settings.city)
    .replace(/{{items}}/g,        itemLines)
    .replace(/{{calendarLink}}/g, settings.calendarLink)
    .replace(/{{address}}/g,      settings.pickupAddress)
}

// ─── StatusBadge ──────────────────────────────────────────
function StatusBadge({ order }: { order: Order }) {
  if (order.delivered) return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.25rem 0.6rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600,
      background: 'rgba(16,185,129,0.15)', color: '#10b981',
      border: '1px solid rgba(16,185,129,0.3)',
    }}>
      <Package size={11} /> סופק
    </span>
  )
  if (order.whatsapp_sent) return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.25rem 0.6rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600,
      background: 'rgba(59,130,246,0.15)', color: '#3b82f6',
      border: '1px solid rgba(59,130,246,0.3)',
    }}>
      <Send size={11} /> נשלח
    </span>
  )
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.25rem 0.6rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600,
      background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
      border: '1px solid rgba(245,158,11,0.25)',
    }}>
      ⏳ ממתין
    </span>
  )
}

// ─── Main page ────────────────────────────────────────────
export default function OrdersPage() {
  const [orders, setOrders]           = useState<Order[]>([])
  const [loading, setLoading]         = useState(true)
  const [importing, setImporting]     = useState(false)
  const [importResult, setImportResult] = useState<ImportResult>(null)
  const [settings, setSettings]       = useState<Settings | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [filter, setFilter]           = useState('all')
  const [dragging, setDragging]       = useState(false)
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null)
  const [bulkOrders, setBulkOrders]   = useState<Order[]>([])
  const [selected, setSelected]       = useState<Set<string>>(new Set())
  const [customerSuggestions, setCustomerSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // ── Load settings & orders on mount ───────────────────
  useEffect(() => {
    fetchSettings().then(() => fetchOrders())
  }, [])

  async function fetchSettings() {
    const res = await fetch('/api/settings')
    const data = await res.json()
    setSettings({
      senderName:      data.senderName      || 'רון',
      projectName:     data.projectName     || 'Bakbokim',
      city:            data.city            || 'נתניה',
      pickupAddress:   data.pickupAddress   || '',
      calendarLink:    data.calendarLink    || '',
      messageTemplate: data.messageTemplate || '',
    })
  }

  async function fetchOrders(search = customerSearch, f = filter) {
    setLoading(true)
    const params = new URLSearchParams({ filter: f })
    if (search) params.set('customer', search)
    const res = await fetch(`/api/orders?${params}`)
    const data: Order[] = await res.json()
    setOrders(Array.isArray(data) ? data : [])

    // Build autocomplete suggestions from loaded data
    if (!search) {
      const names = [...new Set(data.map(o => o.customer_name).filter(Boolean))]
      setCustomerSuggestions(names.sort())
    }
    setLoading(false)
  }

  // ── Filters ───────────────────────────────────────────
  async function applyFilter(f: string) {
    setFilter(f); setSelected(new Set())
    await fetchOrders(customerSearch, f)
  }

  async function applySearch(s: string) {
    setCustomerSearch(s); setShowSuggestions(false); setSelected(new Set())
    await fetchOrders(s, filter)
  }

  // ── Import Excel ──────────────────────────────────────
  async function handleFile(file: File) {
    if (!file) return
    setImporting(true)
    setImportResult(null)
    try {
      const { rows, sheetName } = await parseExcel(file)
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, excelSource: file.name, sheetName }),
      })
      const result = await res.json()
      setImportResult(result)
      await fetchOrders()
    } catch (e: any) {
      alert('שגיאה בקריאת הקובץ: ' + e.message)
    }
    setImporting(false)
  }

  // ── Mark sent ─────────────────────────────────────────
  async function markSent(order: Order) {
    setActionLoading(`sent-${order.id}`)
    const url = `https://wa.me/${order.phone}?text=${encodeURIComponent(buildMessage(order, settings!))}`
    window.open(url, '_blank')
    await fetch(`/api/orders/${order.id}/sent`, { method: 'PATCH' })
    await fetchOrders()
    setActionLoading(null)
  }

  // ── Toggle delivered ──────────────────────────────────
  async function toggleDelivered(order: Order) {
    setActionLoading(`del-${order.id}`)
    await fetch(`/api/orders/${order.id}/delivered`, { method: 'PATCH' })
    await fetchOrders()
    setActionLoading(null)
  }

  // ── Stats ─────────────────────────────────────────────
  const total      = orders.length
  const sent       = orders.filter(o => o.whatsapp_sent).length
  const delivered  = orders.filter(o => o.delivered).length
  const pending    = orders.filter(o => !o.whatsapp_sent).length

  // ── Drag & drop ───────────────────────────────────────
  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  // ── Bulk send ─────────────────────────────────────────
  function openBulk() {
    const selOrders = orders.filter(o => selected.has(o.id))
    if (!selOrders.length) return
    setBulkOrders(selOrders)
  }

  async function onBulkSent(order: Order) {
    await fetch(`/api/orders/${order.id}/sent`, { method: 'PATCH' })
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, whatsapp_sent: true } : o))
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  function toggleSelectAll() {
    if (selected.size === orders.length) setSelected(new Set())
    else setSelected(new Set(orders.map(o => o.id)))
  }

  const filterButtons = [
    { key: 'all',         label: 'הכל' },
    { key: 'unsent',      label: 'לא נשלחו' },
    { key: 'sent',        label: 'נשלחו' },
    { key: 'undelivered', label: 'לא סופקו' },
    { key: 'delivered',   label: 'סופקו' },
  ]

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>הזמנות</h1>
          <p style={{ color: 'var(--color-text-dim)', marginTop: '0.2rem', fontSize: '0.9rem' }}>
            העלה קובץ אקסל, נהל סטטוס ושלח הודעות WhatsApp
          </p>
        </div>
        <button
          onClick={() => fetchOrders()}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.5rem 1rem', borderRadius: '8px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)',
            color: 'var(--color-text-dim)', cursor: 'pointer', fontSize: '0.875rem',
            transition: 'all 0.15s', fontFamily: 'inherit',
          }}
        >
          <RefreshCw size={15} /> רענן
        </button>
      </div>

      {/* ── Stats bar ── */}
      {orders.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem' }} className="animate-fade-in">
          {[
            { label: 'סה״כ', value: total,     color: 'var(--color-accent)',  icon: ClipboardList },
            { label: 'ממתינות', value: pending, color: '#f59e0b', icon: BarChart3 },
            { label: 'נשלחו',   value: sent,    color: '#3b82f6', icon: Send },
            { label: 'סופקו',   value: delivered, color: '#10b981', icon: Package },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="glass" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
                background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, lineHeight: 1, color }}>{value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: '2px' }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Upload zone ── */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className="glass"
        style={{
          padding: '1.5rem', textAlign: 'center',
          border: `1px dashed ${dragging ? 'var(--color-accent)' : 'var(--color-border)'}`,
          background: dragging ? 'rgba(124,58,237,0.07)' : undefined,
          transition: 'all 0.2s', cursor: 'pointer',
        }}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        {importing ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: 'var(--color-accent)' }}>
            <Loader2 size={22} className="animate-spin" />
            <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>מייבא הזמנות...</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Upload size={20} style={{ color: 'var(--color-accent)' }} />
            <span style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>
              גרור קובץ אקסל לכאן או
            </span>
            <span style={{
              padding: '0.35rem 0.9rem', borderRadius: '8px',
              background: 'linear-gradient(135deg, #7c3aed, #9b1d42)',
              color: 'white', fontSize: '0.85rem', fontWeight: 600,
            }}>
              בחר קובץ
            </span>
          </div>
        )}
        <input id="fileInput" type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
      </div>

      {/* ── Import result ── */}
      {importResult && (
        <div className="animate-fade-in" style={{
          display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
          padding: '0.75rem 1rem', borderRadius: '10px',
          background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
        }}>
          <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
          <span style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 500 }}>
            יבוא הושלם:
          </span>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)' }}>
            {importResult.added} הזמנות חדשות נוספו · {importResult.existing} כבר קיימות
            {importResult.errors > 0 && ` · ${importResult.errors} שגיאות`}
          </span>
          <button onClick={() => setImportResult(null)} style={{ marginRight: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Filters toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>

        {/* Customer search */}
        <div style={{ position: 'relative', flex: '1', minWidth: 200 }}>
          <Search size={15} style={{
            position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--color-text-muted)', pointerEvents: 'none',
          }} />
          <input
            type="text"
            placeholder="חיפוש לפי לקוח..."
            value={customerSearch}
            onChange={e => { setCustomerSearch(e.target.value); setShowSuggestions(true) }}
            onKeyDown={e => { if (e.key === 'Enter') applySearch(customerSearch) }}
            onFocus={() => setShowSuggestions(true)}
            style={{
              width: '100%', padding: '0.55rem 2.25rem 0.55rem 0.85rem',
              background: 'var(--color-card)', border: '1px solid var(--color-border)',
              borderRadius: '10px', color: 'var(--color-text)', fontSize: '0.875rem',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
          {customerSearch && (
            <button onClick={() => { setCustomerSearch(''); applySearch('') }}
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
              <X size={13} />
            </button>
          )}
          {/* Suggestions dropdown */}
          {showSuggestions && customerSearch && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, left: 0, zIndex: 50, marginTop: '4px',
              background: 'var(--color-card)', border: '1px solid var(--color-border)',
              borderRadius: '10px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              maxHeight: 240, overflowY: 'auto',
            }} className="animate-slide-down">
              {customerSuggestions
                .filter(n => n.toLowerCase().includes(customerSearch.toLowerCase()))
                .map(name => (
                  <button key={name} onClick={() => applySearch(name)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      width: '100%', padding: '0.6rem 0.85rem',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--color-text)', fontSize: '0.875rem', textAlign: 'right',
                      fontFamily: 'inherit', transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <Users size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                    {name}
                  </button>
                ))
              }
            </div>
          )}
        </div>

        {/* Status filter buttons */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {filterButtons.map(({ key, label }) => (
            <button key={key} onClick={() => applyFilter(key)}
              style={{
                padding: '0.45rem 0.9rem', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 500,
                border: `1px solid ${filter === key ? 'var(--color-accent)' : 'var(--color-border)'}`,
                background: filter === key ? 'var(--color-accent-dim)' : 'transparent',
                color: filter === key ? 'var(--color-accent-light)' : 'var(--color-text-dim)',
                cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Bulk send */}
        {selected.size > 0 && (
          <button onClick={openBulk} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1rem', borderRadius: '8px',
            background: 'linear-gradient(135deg, #25d366, #128c7e)',
            border: 'none', color: 'white', cursor: 'pointer',
            fontSize: '0.875rem', fontWeight: 600, fontFamily: 'inherit',
            boxShadow: '0 4px 14px rgba(37,211,102,0.3)',
          }}>
            <Send size={15} />
            שלח {selected.size} נבחרים
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="glass" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 44, borderRadius: '8px', opacity: 1 - i * 0.15 }} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <Upload size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--color-text-dim)' }}>אין הזמנות</p>
            <p style={{ fontSize: '0.85rem' }}>העלה קובץ אקסל כדי להתחיל</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.025)' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', width: 36 }}>
                    <input type="checkbox"
                      checked={selected.size === orders.length && orders.length > 0}
                      onChange={toggleSelectAll}
                      style={{ accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                    />
                  </th>
                  {['הזמנה', 'לקוח', 'טלפון', 'פריטים', 'סטטוס', 'פעולות'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--color-text-dim)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order, idx) => (
                  <tr key={order.id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      background: selected.has(order.id) ? 'rgba(124,58,237,0.06)' : 'transparent',
                      transition: 'background 0.1s',
                      opacity: order.delivered ? 0.7 : 1,
                    }}
                    onMouseEnter={e => { if (!selected.has(order.id)) e.currentTarget.style.background = 'rgba(255,255,255,0.025)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = selected.has(order.id) ? 'rgba(124,58,237,0.06)' : 'transparent' }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <input type="checkbox" checked={selected.has(order.id)} onChange={() => toggleSelect(order.id)}
                        style={{ accentColor: 'var(--color-accent)', cursor: 'pointer' }} />
                    </td>

                    {/* Order number */}
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500, whiteSpace: 'nowrap', color: 'var(--color-text-dim)', fontSize: '0.8rem' }}>
                      {order.order_number || '—'}
                    </td>

                    {/* Customer */}
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {order.customer_name || '—'}
                    </td>

                    {/* Phone */}
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-dim)', fontSize: '0.82rem', direction: 'ltr', textAlign: 'right' }}>
                      {order.phone ? `0${order.phone.replace(/^972/, '')}` : '—'}
                    </td>

                    {/* Items with wine images */}
                    <td style={{ padding: '0.75rem 1rem', maxWidth: 300 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {order.items.slice(0, 3).map((item, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <WineImage wineName={item.name} size={28} />
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
                              {item.name}
                              <span style={{ color: 'var(--color-accent-light)', marginRight: '0.3rem', fontWeight: 600 }}>
                                × {item.qty}
                              </span>
                            </span>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            +{order.items.length - 3} נוספים
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                      <StatusBadge order={order} />
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>

                        {/* Preview */}
                        <button title="תצוגה מקדימה" onClick={() => setPreviewOrder(order)}
                          style={{ ...iconBtnStyle }}>
                          <Eye size={15} />
                        </button>

                        {/* WhatsApp send */}
                        <button title={order.whatsapp_sent ? 'שלח שוב' : 'שלח ב-WhatsApp'}
                          onClick={() => settings && markSent(order)}
                          disabled={actionLoading === `sent-${order.id}`}
                          style={{ ...iconBtnStyle, ...(order.whatsapp_sent ? {} : greenIconStyle) }}>
                          {actionLoading === `sent-${order.id}` ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                        </button>

                        {/* Delivered toggle */}
                        <button
                          title={order.delivered ? 'בטל סופק' : 'סמן כסופק'}
                          onClick={() => toggleDelivered(order)}
                          disabled={actionLoading === `del-${order.id}`}
                          style={{ ...iconBtnStyle, ...(order.delivered ? deliveredActiveStyle : {}) }}>
                          {actionLoading === `del-${order.id}` ? <Loader2 size={15} className="animate-spin" /> : <Truck size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {previewOrder && settings && (
        <PreviewModal
          order={previewOrder}
          message={buildMessage(previewOrder, settings)}
          onClose={() => setPreviewOrder(null)}
          onSend={() => { markSent(previewOrder); setPreviewOrder(null) }}
        />
      )}

      {bulkOrders.length > 0 && settings && (
        <BulkSendModal
          orders={bulkOrders}
          settings={settings}
          buildMessage={buildMessage}
          onSent={onBulkSent}
          onClose={() => { setBulkOrders([]); setSelected(new Set()); fetchOrders() }}
        />
      )}
    </div>
  )
}

// ── Shared button styles ───────────────────────────────────
const iconBtnStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: '8px', border: '1px solid var(--color-border)',
  background: 'rgba(255,255,255,0.04)', color: 'var(--color-text-dim)',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s', flexShrink: 0,
}
const greenIconStyle: React.CSSProperties = {
  borderColor: 'rgba(37,211,102,0.3)', color: '#25d366',
  background: 'rgba(37,211,102,0.08)',
}
const deliveredActiveStyle: React.CSSProperties = {
  borderColor: 'rgba(16,185,129,0.4)', color: '#10b981',
  background: 'rgba(16,185,129,0.12)',
}
