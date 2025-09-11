import { NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'
import { resolveFontUrl } from '@/lib/font-url'

export async function GET() {
  try {
    const all = await fontStorageClean.getAllFonts()
    const total = all.length
    const withUrl = all.filter((f) => !!resolveFontUrl(f)).length
    const withoutUrl = total - withUrl
    const sampleMissing = all.filter((f) => !resolveFontUrl(f)).slice(0, 10).map((f: any) => ({ id: f.id, filename: f.filename, family: f.family }))
    return NextResponse.json({ success: true, total, withUrl, withoutUrl, sampleMissing })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}
