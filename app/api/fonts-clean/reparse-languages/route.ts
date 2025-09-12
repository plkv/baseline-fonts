import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export async function POST(_req: NextRequest) {
  try {
    const all = await fontStorageClean.getAllFonts()
    let updated = 0
    for (const f of all as any[]) {
      try {
        const resp = await fetch(f.blobUrl)
        if (!resp.ok) continue
        const buf = await resp.arrayBuffer()
        const { parseFontFile } = await import('@/lib/font-parser')
        const parsed = await parseFontFile(buf, f.filename, f.fileSize || buf.byteLength)
        const langs = Array.isArray(parsed.languages) && parsed.languages.length ? parsed.languages : ['Latin']
        // only write when changed
        const old = Array.isArray(f.languages) ? f.languages : []
        if (JSON.stringify(old.sort()) !== JSON.stringify(langs.slice().sort())) {
          await fontStorageClean.updateFont(f.id, { languages: langs } as any)
          updated++
        }
      } catch {}
    }
    return NextResponse.json({ success: true, updated, total: all.length })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}

