import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Normalise wine name for cache key
function normalise(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

// ── Strategy 1: Try the custom URL set in settings ────────
async function tryCustomUrl(wineName: string, url: string): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) })
    if (!res.ok) return null
    const html = await res.text()

    // Look for img tags near the wine name (simple heuristic)
    const nameWords = wineName.toLowerCase().split(' ').filter(w => w.length > 2)
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
    let match: RegExpExecArray | null
    const candidates: string[] = []

    while ((match = imgRegex.exec(html)) !== null) {
      const imgSrc = match[1]
      const context = html.slice(Math.max(0, match.index - 200), match.index + 300).toLowerCase()
      const score = nameWords.filter(w => context.includes(w)).length
      if (score >= Math.ceil(nameWords.length * 0.5)) {
        candidates.push(imgSrc)
      }
    }

    if (candidates[0]) {
      // Make absolute if relative
      const base = new URL(url)
      return new URL(candidates[0], base.origin).href
    }
    return null
  } catch { return null }
}

// ── Strategy 2: Vivino search ─────────────────────────────
async function tryVivino(wineName: string): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(wineName)
    const apiUrl  = `https://www.vivino.com/api/explore?q=${encoded}&min_rating=1&language=en`
    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const json = await res.json()
    const wine = json?.explore_vintage?.matches?.[0]?.vintage?.wine
    const image = wine?.image?.variations?.medium
    if (image) return image.startsWith('//') ? `https:${image}` : image
    return null
  } catch { return null }
}

// ── Strategy 3: Bing image search scraping ────────────────
async function tryWebSearch(wineName: string): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(`${wineName} wine bottle`)
    const res = await fetch(`https://www.bing.com/images/search?q=${encoded}&form=HDRSC2`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const match = html.match(/"murl":"([^"]+)"/);
    return match?.[1] || null
  } catch { return null }
}

// ── GET /api/wines/image?name=... ─────────────────────────
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name') || ''
  if (!name) return NextResponse.json({ url: null })

  const key     = normalise(name)
  const supabase = createAdminClient()

  // 1. Check cache
  const { data: cached } = await supabase
    .from('wine_images')
    .select('image_url')
    .eq('wine_name', key)
    .single()

  if (cached?.image_url) return NextResponse.json({ url: cached.image_url, source: 'cache' })

  // 2. Get custom URL from settings
  const { data: setting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'wineSearchUrl')
    .single()
  const customUrl = setting?.value || ''

  // 3. Try each strategy in order
  let imageUrl: string | null = null
  let source = 'web'

  if (customUrl) {
    imageUrl = await tryCustomUrl(name, customUrl)
    if (imageUrl) source = 'custom_url'
  }
  if (!imageUrl) {
    imageUrl = await tryVivino(name)
    if (imageUrl) source = 'vivino'
  }
  if (!imageUrl) {
    imageUrl = await tryWebSearch(name)
    if (imageUrl) source = 'web'
  }

  // 4. Save to cache (even if null — use placeholder to avoid repeated misses)
  if (imageUrl) {
    await supabase.from('wine_images').upsert({
      wine_name: key, image_url: imageUrl, source,
    })
  }

  return NextResponse.json({ url: imageUrl, source })
}
