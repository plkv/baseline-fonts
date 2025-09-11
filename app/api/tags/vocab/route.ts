import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

const keyOf = (type: 'appearance'|'category', collection: 'Text'|'Display'|'Weirdo') => `tags:vocab:${type}:${collection}`

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = (searchParams.get('type') as any) || 'appearance'
  const collection = (searchParams.get('collection') as any) || 'Text'
  const key = keyOf(type, collection)
  try {
    const list = (await kv.get<string[]>(key)) || []
    return NextResponse.json({ success: true, type, collection, list })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, collection, list } = body as { type: 'appearance'|'category', collection: 'Text'|'Display'|'Weirdo', list: string[] }
    if (!type || !collection || !Array.isArray(list)) {
      return NextResponse.json({ success: false, error: 'type, collection, list required' }, { status: 400 })
    }
    const key = keyOf(type, collection)
    await kv.set(key, list)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}

