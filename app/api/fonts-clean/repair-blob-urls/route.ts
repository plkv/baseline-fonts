import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export async function POST(_req: NextRequest) {
  try {
    const blob = await import('@vercel/blob')
    // List blobs (could be outside fonts/); attempt fuzzy match by filename
    const { blobs } = await blob.list({})

    const fonts = await fontStorageClean.getAllFonts()
    let updated = 0
    const missing: Array<{ id: string; filename: string }> = []
    for (const f of fonts) {
      const hasBlob = Boolean((f as any).blobUrl)
      const hasUrl = Boolean((f as any).url)
      if (hasBlob || hasUrl) continue
      const parts = f.filename.split('.')
      const base = parts.slice(0, -1).join('.')
      const ext = parts[parts.length - 1].toLowerCase()
      const candidates = blobs.filter((b: any) => {
        const seg = b.pathname.split('/').pop() || ''
        const segLower = seg.toLowerCase()
        return segLower.startsWith(base.toLowerCase()) && segLower.endsWith('.' + ext)
      })
      // Prefer exact filename match first
      const exact = candidates.find((b: any) => (b.pathname.split('/').pop() || '') === f.filename)
      const pick = exact || candidates[0]
      const url = pick?.url
      if (url) {
        await fontStorageClean.updateFont(f.id, { blobUrl: url } as any)
        updated++
      } else {
        missing.push({ id: f.id, filename: f.filename })
      }
    }
    return NextResponse.json({ success: true, checked: fonts.length, updated, missing })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}
