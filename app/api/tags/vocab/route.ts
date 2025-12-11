import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

// Unified vocabulary - no longer separated by collection
const keyOf = (type: 'appearance'|'category') => `tags:vocab:${type}`

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = (searchParams.get('type') as any) || 'appearance'
  const key = keyOf(type)
  try {
    const list = (await kv.get<string[]>(key)) || []
    return NextResponse.json({ success: true, type, list })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, list } = body as { type: 'appearance'|'category', list: string[] }
    if (!type || !Array.isArray(list)) {
      return NextResponse.json({ success: false, error: 'type and list required' }, { status: 400 })
    }
    const key = keyOf(type)
    await kv.set(key, list)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}

