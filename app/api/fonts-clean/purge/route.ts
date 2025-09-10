import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'
import { kv } from '@vercel/kv'

export async function POST(_req: NextRequest) {
  try {
    // Fetch all fonts via storage (uses index under the hood)
    const fonts = await fontStorageClean.getAllFonts()
    let deleted = 0
    for (const f of fonts) {
      try {
        await fontStorageClean.deleteFont(f.id)
        deleted++
      } catch (e) {
        console.error('Failed to delete font', f.id, e)
      }
    }
    // Reset index explicitly
    await kv.set('font_index', [])
    return NextResponse.json({ success: true, total: fonts.length, deleted })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  // Alias DELETE to POST behavior for convenience
  return POST(req)
}

