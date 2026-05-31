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
      .select('*')
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
// Efficient bulk import: 2 DB calls total regardless of row count
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

    // ── Step 1: Find which (order_number, phone) pairs already exist ──
    const pairs = records.map(r => `${r.order_number}__${r.phone}`)

    const { data: existing } = await supabase
      .from('orders')
      .select('order_number, phone')
      .in('order_number', records.map(r => r.order_number))

    const existingKeys = new Set(
      (existing ?? []).map((r: any) => `${r.order_number}__${r.phone}`)
    )

    const newRecords = records.filter(r => !existingKeys.has(`${r.order_number}__${r.phone}`))
    const existingCount = records.length - newRecords.length

    // ── Step 2: Bulk insert only new records ──
    let added = 0
    let errors = skipped

    if (newRecords.length > 0) {
      const { error } = await supabase
        .from('orders')
        .insert(newRecords)

      if (error) {
        console.error('bulk insert error:', error)
        errors += newRecords.length
      } else {
        added = newRecords.length
      }
    }

    return NextResponse.json({ added, existing: existingCount, errors })
  } catch (e: any) {
    console.error('import error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
