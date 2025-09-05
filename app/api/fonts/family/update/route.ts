import { NextRequest, NextResponse } from 'next/server'
import { fontStorageV2 } from '@/lib/font-storage-v2'

export async function PATCH(request: NextRequest) {
  console.log('🔥 PATCH endpoint called - v0.034')
  let familyName = 'unknown'
  let updates = {}
  
  try {
    const requestData = await request.json()
    familyName = requestData.familyName
    updates = requestData.updates
    
    console.log('🔍 Family update request:', { familyName, updates })
    
    if (!familyName || !updates) {
      return NextResponse.json({ 
        error: 'Family name and updates are required' 
      }, { status: 400 })
    }

    // Get all fonts and find fonts in this family
    const fonts = await fontStorageV2.getAllFonts()
    console.log('🔍 Total fonts in storage:', fonts.length)
    
    // Debug: log all family names in storage
    const allFamilyNames = fonts.map(f => f.family)
    console.log('🔍 All family names in storage:', allFamilyNames)
    console.log('🔍 Searching for family name:', `"${familyName}"`)
    
    const familyFonts = fonts.filter(f => f.family === familyName)
    console.log('🔍 Fonts in family', familyName, ':', familyFonts.length)
    
    // Try fuzzy matching if exact match fails
    if (familyFonts.length === 0) {
      console.log('🔍 Exact match failed, trying fuzzy matching...')
      const fuzzyMatches = fonts.filter(f => 
        f.family.toLowerCase().includes(familyName.toLowerCase()) || 
        familyName.toLowerCase().includes(f.family.toLowerCase())
      )
      console.log('🔍 Fuzzy matches found:', fuzzyMatches.length, fuzzyMatches.map(f => f.family))
    }
    
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
      
      console.log('🔧 Updating font:', font.filename, 'with:', updates_to_apply)
      
      // Update individual font
      const success = await fontStorageV2.updateFont(font.filename, updates_to_apply)
      console.log('🔍 Update result for', font.filename, ':', success)
      if (success) updateCount++
    }

    console.log('✅ Updated', updateCount, 'of', familyFonts.length, 'fonts in family', familyName)

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