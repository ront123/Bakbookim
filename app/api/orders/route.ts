import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// ─── GET /api/orders ─────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(req.url)
    const customer = searchParams.get('customer') || ''
    const filter   = searchParams.get('filter')   || 'all'
    const station  = searchParams.get('station')  || ''

    let query = supabase
      .from('orders')
      .select('id, order_number, customer_name, phone, items, distribution_station, whatsapp_sent, whatsapp_sent_at, delivered, delivered_at, created_at')
      .order('created_at', { ascending: false })

    if (customer) query = query.ilike('customer_name', `%${customer}%`)
    if (station)  query = query.eq('distribution_station', station)

    if (filter === 'sent')        query = query.eq('whatsapp_sent', true)
    if (filter === 'unsent')      query = query.eq('whatsapp_sent', false)
    if (filter === 'delivered')   query = query.eq('delivered', true)
    if (filter === 'undelivered') query = query.eq('delivered', false)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ─── POST /api/orders ─────────────────────────────────────
// Efficient bulk import with merge capabilities: 2 DB calls total
export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await req.json()
    const { rows, excelSource, sheetName } = body as {
      rows: any[]
      excelSource: string
      sheetName: string
    }

    if (!rows?.length) return NextResponse.json({ added: 0, existing: 0, errors: 0 })

    // Build records, skip rows with no order_number AND no phone
    const records = rows
      .filter(r => r.order_number || r.phone)
      .map(r => ({
        order_number:          String(r.order_number          || ''),
        customer_name:         String(r.customer_name         || ''),
        phone:                 String(r.phone                 || ''),
        distribution_station:  String(r.distribution_station || '') || null,
        items:                 r.items    ?? [],
        raw_row:               r.raw_row  ?? {},
        sheet_name:            sheetName,
        excel_source:          excelSource,
      }))

    const skipped = rows.length - records.length

    if (!records.length) {
      return NextResponse.json({ added: 0, existing: 0, errors: skipped })
    }

    // ── Step 1: Merge duplicates within the incoming records list first ──
    const mergedIncoming = new Map<string, any>()
    for (const r of records) {
      const key = `${r.order_number}__${r.phone}`
      if (mergedIncoming.has(key)) {
        const existingIncoming = mergedIncoming.get(key)
        existingIncoming.items = mergeItems(existingIncoming.items, r.items)
        if (!existingIncoming.distribution_station && r.distribution_station) {
          existingIncoming.distribution_station = r.distribution_station
        }
        existingIncoming.raw_row = { ...existingIncoming.raw_row, ...r.raw_row }
      } else {
        mergedIncoming.set(key, { ...r })
      }
    }
    const uniqueIncoming = Array.from(mergedIncoming.values())

    // ── Step 2: Find which records already exist in the database ──
    const { data: existing } = await supabase
      .from('orders')
      .select('id, order_number, phone, items, distribution_station, whatsapp_sent, delivered')
      .in('order_number', uniqueIncoming.map(r => r.order_number))

    const existingMap = new Map<string, any>()
    for (const row of (existing ?? [])) {
      existingMap.set(`${row.order_number}__${row.phone}`, row)
    }

    // ── Step 3: Compute final records to upsert (merging with DB data if exist) ──
    const finalRecords: any[] = []
    let added = 0
    let existingCount = 0

    for (const incoming of uniqueIncoming) {
      const key = `${incoming.order_number}__${incoming.phone}`
      if (existingMap.has(key)) {
        existingCount++
        const dbRecord = existingMap.get(key)
        finalRecords.push({
          id: dbRecord.id, // keep the database row ID
          order_number: dbRecord.order_number,
          customer_name: dbRecord.customer_name || incoming.customer_name,
          phone: dbRecord.phone,
          distribution_station: dbRecord.distribution_station || incoming.distribution_station,
          items: mergeItems(dbRecord.items, incoming.items),
          raw_row: incoming.raw_row,
          sheet_name: incoming.sheet_name,
          excel_source: incoming.excel_source,
          whatsapp_sent: dbRecord.whatsapp_sent,
          delivered: dbRecord.delivered,
          updated_at: new Date().toISOString()
        })
      } else {
        added++
        finalRecords.push({
          order_number: incoming.order_number,
          customer_name: incoming.customer_name,
          phone: incoming.phone,
          distribution_station: incoming.distribution_station,
          items: incoming.items,
          raw_row: incoming.raw_row,
          sheet_name: incoming.sheet_name,
          excel_source: incoming.excel_source,
          whatsapp_sent: false,
          delivered: false
        })
      }
    }

    // ── Step 4: Bulk upsert combined list ──
    let errors = skipped
    if (finalRecords.length > 0) {
      const { error } = await supabase
        .from('orders')
        .upsert(finalRecords, { onConflict: 'order_number,phone' })

      if (error) {
        console.error('bulk upsert error:', error)
        errors += finalRecords.length
        added = 0
        existingCount = 0
      }
    }

    return NextResponse.json({ added, existing: existingCount, errors })
  } catch (e: any) {
    console.error('import error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ─── Helper: mergeItems ────────────────────────────────────
function mergeItems(existingItems: any[], newItems: any[]) {
  const merged: Record<string, number> = {}
  
  const parseQty = (q: any): number => {
    const num = Number(q)
    return isNaN(num) ? 0 : num
  }

  const itemsList = [...(existingItems || []), ...(newItems || [])]
  for (const item of itemsList) {
    if (!item || !item.name) continue
    const name = String(item.name).trim()
    merged[name] = (merged[name] || 0) + parseQty(item.qty)
  }

  return Object.entries(merged)
    .filter(([_, qty]) => qty > 0)
    .map(([name, qty]) => ({ name, qty }))
}
