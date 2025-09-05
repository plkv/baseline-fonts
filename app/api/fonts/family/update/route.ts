import { NextRequest, NextResponse } from 'next/server'
import { fontStorageV2 } from '@/lib/font-storage-v2'

export async function PATCH(request: NextRequest) {
  try {
    const { familyName, updates } = await request.json()
    
    if (!familyName || !updates) {
      return NextResponse.json({ 
        error: 'Family name and updates are required' 
      }, { status: 400 })
    }

    // Get all fonts and find fonts in this family
    const fonts = await fontStorageV2.getAllFonts()
    const familyFonts = fonts.filter(f => f.family === familyName)
    
    if (familyFonts.length === 0) {
      return NextResponse.json({ 
        error: 'Font family not found' 
      }, { status: 404 })
    }

    // Update each font in the family with the family-level changes
    let updateCount = 0
    for (const font of familyFonts) {
      const updates_to_apply: any = {}
      
      // Apply family-level updates
      if (updates.name) updates_to_apply.family = updates.name
      if (updates.category) updates_to_apply.category = updates.category
      if (updates.foundry) updates_to_apply.foundry = updates.foundry
      if (updates.languages) updates_to_apply.languages = updates.languages
      if (updates.downloadLink !== undefined) updates_to_apply.downloadLink = updates.downloadLink
      
      // Update individual font
      const success = await fontStorageV2.updateFont(font.filename, updates_to_apply)
      if (success) updateCount++
    }

    return NextResponse.json({
      success: true,
      message: 'Font family updated successfully',
      updatedCount: updateCount
    })
  } catch (error) {
    console.error('❌ Failed to update font family:', familyName, error)
    console.error('❌ Update payload:', updates)
    return NextResponse.json({ 
      error: 'Failed to update font family',
      details: error instanceof Error ? error.message : 'Unknown error',
      familyName,
      updates
    }, { status: 500 })
  }
}