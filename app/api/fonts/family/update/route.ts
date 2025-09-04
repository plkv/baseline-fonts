import { NextRequest, NextResponse } from 'next/server'
import { fontStorage } from '@/lib/font-database'

export async function PATCH(request: NextRequest) {
  try {
    const { familyName, updates } = await request.json()
    
    if (!familyName || !updates) {
      return NextResponse.json({ 
        error: 'Family name and updates are required' 
      }, { status: 400 })
    }

    // Get all fonts and find fonts in this family
    const fonts = await fontStorage.getAllFonts()
    const familyFonts = fonts.filter(f => f.family === familyName)
    
    if (familyFonts.length === 0) {
      return NextResponse.json({ 
        error: 'Font family not found' 
      }, { status: 404 })
    }

    // Update each font in the family with the family-level changes
    const updatedFonts = fonts.map(font => {
      if (font.family === familyName) {
        const updatedFont = { ...font }
        
        // Apply family-level updates
        if (updates.name) updatedFont.family = updates.name
        if (updates.category) updatedFont.category = updates.category
        if (updates.foundry) updatedFont.foundry = updates.foundry
        if (updates.languages) updatedFont.languages = updates.languages
        
        return updatedFont
      }
      return font
    })

    // Save all updated fonts
    await fontStorage.saveFonts(updatedFonts)

    return NextResponse.json({
      success: true,
      message: 'Font family updated successfully',
      updatedCount: familyFonts.length
    })
  } catch (error) {
    console.error('Failed to update font family:', error)
    return NextResponse.json({ 
      error: 'Failed to update font family',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}