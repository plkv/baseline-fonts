import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { alias, family, ok, ua, details } = body || {}
    if (!alias || typeof ok !== 'boolean') {
      return NextResponse.json({ success: false, error: 'invalid payload' }, { status: 400 })
    }
    const report = {
      ts: new Date().toISOString(),
      alias,
      family,
      ok,
      ua: ua || req.headers.get('user-agent') || '',
      details: details || null,
    }
    const key = `preview_reports:${new Date().toISOString().slice(0, 10)}`
    await kv.rpush(key, JSON.stringify(report))
    await kv.expire(key, 7 * 24 * 3600)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('preview-report error', e)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

