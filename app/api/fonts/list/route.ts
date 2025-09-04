import { NextResponse } from 'next/server'
import { persistentStorage } from '@/lib/persistent-storage'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeUnpublished = searchParams.get('includeUnpublished') === 'true'
    
    // Get fonts from persistent storage manager
    let fonts = await persistentStorage.getAllFonts()

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