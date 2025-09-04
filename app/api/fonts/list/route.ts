import { NextResponse } from 'next/server'
import { vercelFontStorage } from '@/lib/vercel-font-storage'
import { fontStorage } from '@/lib/font-database'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeUnpublished = searchParams.get('includeUnpublished') === 'true'
    
    // Try Vercel storage first, fallback to local storage
    let fonts = await vercelFontStorage.getAllFonts()
    
    // If no fonts in Vercel storage, try local storage
    if (fonts.length === 0) {
      fonts = await fontStorage.getAllFonts()
    }

    // Filter published fonts for public API (unless admin view)
    if (!includeUnpublished) {
      fonts = fonts.filter(font => font.published !== false) // Default to published if undefined
    }

    return NextResponse.json({ 
      success: true, 
      fonts,
      total: fonts.length
    })
  } catch (error) {
    console.error('Failed to load fonts:', error)
    return NextResponse.json({ error: 'Failed to load fonts' }, { status: 500 })
  }
}