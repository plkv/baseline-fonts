import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

// GET /api/families-v2 - Get all families with family-first structure
export async function GET(request: NextRequest) {
  try {
    const families = await fontStorageClean.getAllFamiliesV2()

    return NextResponse.json({
      success: true,
      families,
      totalFamilies: families.length
    })
  } catch (error) {
    console.error('Families V2 list error:', error)
    return NextResponse.json(
      { error: 'Failed to load families', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST /api/families-v2 - Create new family
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, collection, styleTags, languages, category, foundry, downloadLink } = body

    if (!name) {
      return NextResponse.json({ error: 'Family name is required' }, { status: 400 })
    }

    const family = await fontStorageClean.createFamily({
      name,
      collection: collection || 'Text',
      styleTags: styleTags || [],
      languages: languages || ['Latin'],
      category: category || ['Sans'],
      foundry: foundry || 'Unknown',
      isVariable: false,
      published: true,
      downloadLink
    })

    return NextResponse.json({
      success: true,
      family,
      message: 'Family created successfully'
    })
  } catch (error) {
    console.error('Create family error:', error)
    return NextResponse.json(
      { error: 'Failed to create family', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}