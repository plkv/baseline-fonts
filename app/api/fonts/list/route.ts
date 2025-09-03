import { NextResponse } from 'next/server'
import { vercelFontStorage } from '@/lib/vercel-font-storage'

export async function GET() {
  try {
    const fonts = await vercelFontStorage.getAllFonts()
    return NextResponse.json({ 
      success: true, 
      fonts 
    })
  } catch (error) {
    console.error('Failed to load fonts:', error)
    return NextResponse.json({ error: 'Failed to load fonts' }, { status: 500 })
  }
}