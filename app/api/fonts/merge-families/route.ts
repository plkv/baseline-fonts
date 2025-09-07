/**
 * Merge Duplicate Font Families API
 * Fixes the issue where same font family appears multiple times
 */

import { NextRequest, NextResponse } from 'next/server'
import { fontStorageV2 } from '@/lib/font-storage-v2'

export async function POST(request: NextRequest) {
  console.log('🔄 Starting family merge operation...')
  
  try {
    // Get all fonts
    const allFonts = await fontStorageV2.getAllFonts()
    console.log(`📋 Found ${allFonts.length} total fonts`)
    
    // Group fonts by normalized family name
    const familyGroups = new Map<string, any[]>()
    
    allFonts.forEach(font => {
      // Normalize family name (trim, lowercase, remove extra spaces)
      const normalizedFamily = font.family?.trim().replace(/\s+/g, ' ').toLowerCase() || 'unknown'
      
      if (!familyGroups.has(normalizedFamily)) {
        familyGroups.set(normalizedFamily, [])
      }
      familyGroups.get(normalizedFamily)!.push(font)
    })
    
    console.log(`🔍 Found ${familyGroups.size} unique family groups`)
    
    // Find families with duplicates
    const duplicateFamilies = Array.from(familyGroups.entries())
      .filter(([_, fonts]) => fonts.length > 1)
      .filter(([_, fonts]) => {
        // Check if these are actually the same family with different case/spacing
        const distinctNames = new Set(fonts.map(f => f.family?.trim()))
        return distinctNames.size > 1 // Only if there are actual name variations
      })
    
    console.log(`🔍 Found ${duplicateFamilies.length} families with name variations`)
    
    let fixedCount = 0
    
    // Fix each duplicate family
    for (const [normalizedName, fonts] of duplicateFamilies) {
      console.log(`🔧 Processing family group: ${normalizedName}`)
      console.log(`   Font variations:`, fonts.map(f => f.family))
      
      // Pick the "canonical" family name (most common or first alphabetically)
      const nameCounts = new Map<string, number>()
      fonts.forEach(font => {
        const name = font.family?.trim() || 'Unknown'
        nameCounts.set(name, (nameCounts.get(name) || 0) + 1)
      })
      
      // Get the most common name, or first alphabetically if tied
      const canonicalName = Array.from(nameCounts.entries())
        .sort((a, b) => {
          if (a[1] !== b[1]) return b[1] - a[1] // Sort by count desc
          return a[0].localeCompare(b[0]) // Then alphabetically
        })[0][0]
      
      console.log(`   Canonical name chosen: "${canonicalName}"`)
      
      // Update all fonts in this group to use the canonical name
      for (const font of fonts) {
        if (font.family?.trim() !== canonicalName) {
          console.log(`   Updating "${font.family}" -> "${canonicalName}" for ${font.filename}`)
          
          try {
            await fontStorageV2.updateFont(font.filename, {
              family: canonicalName
            })
            fixedCount++
          } catch (error) {
            console.error(`   Failed to update ${font.filename}:`, error)
          }
        }
      }
    }
    
    console.log(`✅ Family merge complete. Fixed ${fixedCount} fonts.`)
    
    return NextResponse.json({
      success: true,
      message: `Merged duplicate families successfully`,
      stats: {
        totalFonts: allFonts.length,
        uniqueFamilies: familyGroups.size,
        duplicateFamilies: duplicateFamilies.length,
        fontsFixed: fixedCount
      }
    })
    
  } catch (error) {
    console.error('❌ Family merge failed:', error)
    return NextResponse.json({
      success: false,
      error: 'MERGE_FAILED',
      message: 'Failed to merge duplicate families',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}