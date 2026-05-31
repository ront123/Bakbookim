import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const supabase = createAdminClient()

    // Toggle: if already delivered, unmark; else mark
    const { data: current } = await supabase
      .from('orders')
      .select('delivered')
      .eq('id', id)
      .single()

    const newDelivered = !(current?.delivered ?? false)

    const { error } = await supabase
      .from('orders')
      .update({
        delivered:    newDelivered,
        delivered_at: newDelivered ? new Date().toISOString() : null,
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, delivered: newDelivered })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
