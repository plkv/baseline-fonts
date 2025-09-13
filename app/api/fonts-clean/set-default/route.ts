import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export async function POST(req: NextRequest) {
  try {
    const { familyName, styleId } = await req.json()
    if (!familyName || !styleId) {
      return NextResponse.json({ success: false, error: 'familyName and styleId required' }, { status: 400 })
    }
    await fontStorageClean.setDefaultStyle(String(familyName), String(styleId))
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'SET_DEFAULT_FAILED' }, { status: 500 })
  }
}

