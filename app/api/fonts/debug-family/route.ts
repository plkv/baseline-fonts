/**
 * Debug Family Data - See what's actually stored
 */

import { NextRequest, NextResponse } from 'next/server'
import { fontStorageV2 } from '@/lib/font-storage-v2'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const familyName = searchParams.get('family')
    
    if (!familyName) {
      return NextResponse.json({
        error: 'Family name required'
      }, { status: 400 })
    }
    
    // Get all fonts and filter by family
    const allFonts = await fontStorageV2.getAllFonts()
    const familyFonts = allFonts.filter(f => f.family === familyName)
    
    return NextResponse.json({
      success: true,
      familyName,
      totalFonts: familyFonts.length,
      fonts: familyFonts.map(font => ({
        filename: font.filename,
        name: font.name,
        family: font.family,
        style: font.style,
        weight: font.weight,
        uploadedAt: font.uploadedAt,
        isVariable: font.isVariable
      }))
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}