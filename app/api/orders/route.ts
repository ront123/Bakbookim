import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// ─── GET /api/orders ─────────────────────────────────────
// Query params: customer, filter (all|sent|unsent|delivered|undelivered)
export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(req.url)
    const customer = searchParams.get('customer') || ''
    const filter   = searchParams.get('filter') || 'all'

    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (customer) {
      query = query.ilike('customer_name', `%${customer}%`)
    }

    if (filter === 'sent')        query = query.eq('whatsapp_sent', true)
    if (filter === 'unsent')      query = query.eq('whatsapp_sent', false)
    if (filter === 'delivered')   query = query.eq('delivered', true)
    if (filter === 'undelivered') query = query.eq('delivered', false)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ─── POST /api/orders ─────────────────────────────────────
// Body: { rows: OrderRow[], excelSource: string, sheetName: string }
export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await req.json()
    const { rows, excelSource, sheetName } = body as {
      rows: any[],
      excelSource: string,
      sheetName: string,
    }

    if (!rows?.length) {
      return NextResponse.json({ added: 0, existing: 0 })
    }

    let added = 0, existing = 0, errors = 0

    for (const row of rows) {
      const record = {
        order_number:  row.order_number  || '',
        customer_name: row.customer_name || '',
        phone:         row.phone         || '',
        items:         row.items         || [],
        raw_row:       row.raw_row       || {},
        sheet_name:    sheetName,
        excel_source:  excelSource,
      }

      // Skip if no order number and no phone
      if (!record.order_number && !record.phone) { errors++; continue }

      const { error } = await supabase
        .from('orders')
        .upsert(record, {
          onConflict: 'order_number,phone',
          ignoreDuplicates: true,   // true = don't overwrite existing rows
        })

      if (error) {
        // Duplicate key = already exists
        if (error.code === '23505' || error.message.includes('duplicate')) {
          existing++
        } else {
          console.error('upsert error:', error)
          errors++
        }
      } else {
        // ignoreDuplicates: true means upserted row count comes from checking
        // We need to detect if it was inserted or already existed
        const { data: check } = await supabase
          .from('orders')
          .select('created_at')
          .eq('order_number', record.order_number)
          .eq('phone', record.phone)
          .single()

        // If created_at is within last 5 seconds → newly inserted
        if (check) {
          const age = Date.now() - new Date(check.created_at).getTime()
          if (age < 5000) added++
          else existing++
        }
      }
    }

    return NextResponse.json({ added, existing, errors })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
