import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export async function GET(request: NextRequest) {
  try {
    const fonts = await fontStorageClean.getAllFonts()

    // Transform fonts to match frontend expectations
    const transformedFonts = fonts.map((font: any) => {
      const url = font?.blobUrl || font?.url || font?.blob || null
      return {
        ...font,
        name: font.family, // Frontend expects 'name' property
        url,               // Expose a best-effort usable URL
      }
    })

    return NextResponse.json({
      success: true,
      fonts: transformedFonts,
      total: fonts.length
    }, {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
      }
    })

  } catch (error) {
    console.error('List error:', error)
    return NextResponse.json({
      error: 'Failed to load fonts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
