import { NextResponse } from 'next/server'
import { vercelFontStorage } from '@/lib/vercel-font-storage'
import { fontStorage } from '@/lib/font-database'

export async function GET() {
  try {
    // Try Vercel storage first, fallback to local storage
    let fonts = await vercelFontStorage.getAllFonts()
    
    // If no fonts in Vercel storage, try local storage
    if (fonts.length === 0) {
      fonts = await fontStorage.getAllFonts()
    }
    return NextResponse.json({ 
      success: true, 
      fonts 
    })
  } catch (error) {
    console.error('Failed to load fonts:', error)
    return NextResponse.json({ error: 'Failed to load fonts' }, { status: 500 })
  }
}