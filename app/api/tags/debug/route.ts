import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const familyName = searchParams.get('family')

    if (!familyName) {
      return NextResponse.json({
        success: false,
        error: 'Missing family parameter'
      }, { status: 400 })
    }

    // Get all fonts
    const all = await fontStorageClean.getAllFonts()

    // Filter by family name
    const familyFonts = (all as any[]).filter(f =>
      f.family?.toLowerCase() === familyName.toLowerCase()
    )

    if (familyFonts.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No fonts found for family "${familyName}"`
      }, { status: 404 })
    }

    // Collect detailed info about each variant's tags
    const variants = familyFonts.map(f => ({
      id: f.id,
      filename: f.filename,
      style: f.style || 'Regular',
      styleTags: f.styleTags || [],
      category: f.category || [],
      collection: f.collection || 'Text'
    }))

    // Aggregate tags (like catalog does)
    const allStyleTags = new Set<string>()
    const allCategories = new Set<string>()

    familyFonts.forEach((f: any) => {
      if (Array.isArray(f.styleTags)) {
        f.styleTags.forEach((tag: string) => allStyleTags.add(tag))
      }
      if (Array.isArray(f.category)) {
        f.category.forEach((cat: string) => allCategories.add(cat))
      }
    })

    return NextResponse.json({
      success: true,
      familyName,
      variantCount: familyFonts.length,
      variants,
      aggregated: {
        styleTags: Array.from(allStyleTags).sort(),
        categories: Array.from(allCategories).sort()
      }
    })

  } catch (error) {
    console.error('Debug failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
