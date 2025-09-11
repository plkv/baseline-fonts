import { NextRequest, NextResponse } from 'next/server'
import { getAllKnownFonts } from '@/lib/all-fonts'
import { toTitleCase } from '@/lib/category-utils'

type Coll = 'Text'|'Display'|'Weirdo'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = (searchParams.get('type') as any) || 'appearance'
    const fonts = await getAllKnownFonts()
    const usage: Record<Coll, Set<string>> = { Text: new Set(), Display: new Set(), Weirdo: new Set() }
    for (const f of fonts as any[]) {
      const coll: Coll = (f.collection as Coll) || 'Text'
      if (type === 'category') {
        (f.category || []).forEach((t: string) => usage[coll].add(toTitleCase(t)))
      } else {
        (f.styleTags || []).forEach((t: string) => usage[coll].add(toTitleCase(t)))
      }
    }
    const out = {
      success: true,
      type,
      usage: {
        Text: Array.from(usage.Text).sort((a,b)=>a.localeCompare(b)),
        Display: Array.from(usage.Display).sort((a,b)=>a.localeCompare(b)),
        Weirdo: Array.from(usage.Weirdo).sort((a,b)=>a.localeCompare(b)),
      }
    }
    return NextResponse.json(out)
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}

