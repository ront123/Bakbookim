import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/settings
export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('settings').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Convert rows array to object { key: value }
  const result: Record<string, string> = {}
  data?.forEach((row: { key: string; value: string }) => { result[row.key] = row.value })
  return NextResponse.json(result)
}

// POST /api/settings
// Body: { key: string, value: string }[]  OR  { [key]: value }
export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await req.json()

    const pairs = Array.isArray(body)
      ? body
      : Object.entries(body).map(([key, value]) => ({ key, value: String(value) }))

    for (const { key, value } of pairs) {
      await supabase.from('settings').upsert({ key, value, updated_at: new Date().toISOString() })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
