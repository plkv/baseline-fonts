import { NextResponse } from 'next/server'
import { blobOnlyStorage } from '@/lib/blob-only-storage'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeUnpublished = searchParams.get('includeUnpublished') === 'true'
    
    // Get fonts from blob-only storage manager
    let fonts = await blobOnlyStorage.getAllFonts()

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