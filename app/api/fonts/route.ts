/**
 * Clean Font API - Single endpoint replacing 37 old endpoints
 * GET /api/fonts - List fonts with filtering
 * POST /api/fonts - Upload new font
 */

import { NextRequest, NextResponse } from 'next/server'
import { fontStorage } from '@/lib/font-storage'
import { FilterState } from '@/lib/types'

// GET /api/fonts - List fonts with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse filters from query parameters
    const filters: FilterState = {
      collection: searchParams.get('collection') as any || undefined,
      categories: searchParams.get('categories')?.split(',') as any || [],
      tags: searchParams.get('tags')?.split(',') || [],
      languages: searchParams.get('languages')?.split(',') || [],
      weights: searchParams.get('weights')?.split(',').map(Number).filter(Boolean) || [],
      isVariable: searchParams.get('variable') === 'true' ? true : 
                   searchParams.get('variable') === 'false' ? false : undefined,
      search: searchParams.get('search') || undefined,
    }
    
    // Clean up empty arrays
    Object.keys(filters).forEach(key => {
      if (Array.isArray(filters[key as keyof FilterState]) && (filters[key as keyof FilterState] as any[]).length === 0) {
        delete filters[key as keyof FilterState]
      }
    })
    
    const returnFamilies = searchParams.get('families') === 'true'
    
    if (returnFamilies) {
      // Return grouped families
      const families = await fontStorage.getFontFamilies(filters)
      return NextResponse.json({
        success: true,
        families,
        total: families.length
      })
    } else {
      // Return individual fonts
      const fonts = await fontStorage.getAllFonts(filters)
      return NextResponse.json({
        success: true,
        fonts,
        total: fonts.length
      })
    }
    
  } catch (error) {
    console.error('GET /api/fonts error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch fonts',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// POST /api/fonts - Upload new font
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' }, 
        { status: 400 }
      )
    }
    
    // Validate file type
    if (!file.name.match(/\.(ttf|otf|woff|woff2)$/i)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file format. Only TTF, OTF, WOFF, and WOFF2 are supported.' }, 
        { status: 400 }
      )
    }
    
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 10MB.' }, 
        { status: 400 }
      )
    }
    
    // Parse optional metadata from form data
    const metadata = {
      collection: formData.get('collection') as any || 'Text',
      tags: formData.get('tags')?.toString().split(',').map(t => t.trim()).filter(Boolean) || [],
      name: formData.get('name')?.toString(),
      family: formData.get('family')?.toString(),
    }
    
    // Upload and store
    const font = await fontStorage.uploadFont(file, metadata)
    
    // TODO: Parse OpenType metadata in background
    // This would enhance the font with proper weight, style, features, etc.
    
    return NextResponse.json({
      success: true,
      font
    })
    
  } catch (error) {
    console.error('POST /api/fonts error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}