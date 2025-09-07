/**
 * Detect and Preview Duplicate Font Families API
 * Shows which families would be merged without actually merging them
 */

import { NextRequest, NextResponse } from 'next/server'
import { fontStorageV2 } from '@/lib/font-storage-v2'

export async function GET(request: NextRequest) {
  console.log('🔍 Detecting duplicate families...')
  
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
    
    // Find families with duplicates
    const duplicateFamilies = Array.from(familyGroups.entries())
      .filter(([_, fonts]) => {
        // Check if these are actually the same family with different case/spacing
        const distinctNames = new Set(fonts.map(f => f.family?.trim()))
        return distinctNames.size > 1 // Only if there are actual name variations
      })
      .map(([normalizedName, fonts]) => {
        // Pick the "canonical" family name (most common or first alphabetically)
        const nameCounts = new Map<string, number>()
        fonts.forEach(font => {
          const name = font.family?.trim() || 'Unknown'
          nameCounts.set(name, (nameCounts.get(name) || 0) + 1)
        })
        
        const canonicalName = Array.from(nameCounts.entries())
          .sort((a, b) => {
            if (a[1] !== b[1]) return b[1] - a[1] // Sort by count desc
            return a[0].localeCompare(b[0]) // Then alphabetically
          })[0][0]
        
        return {
          normalizedName,
          canonicalName,
          variations: Array.from(new Set(fonts.map(f => f.family?.trim()))).sort(),
          fonts: fonts.map(f => ({
            filename: f.filename,
            family: f.family,
            style: f.style,
            foundry: f.foundry
          })),
          fontCount: fonts.length
        }
      })
    
    console.log(`🔍 Found ${duplicateFamilies.length} families with variations`)
    
    return NextResponse.json({
      success: true,
      duplicateFamilies,
      totalIssues: duplicateFamilies.reduce((sum, group) => sum + group.fontCount, 0)
    })
    
  } catch (error) {
    console.error('❌ Family detection failed:', error)
    return NextResponse.json({
      success: false,
      error: 'DETECTION_FAILED',
      message: 'Failed to detect duplicate families',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  console.log('🔄 Starting selective family merge...')
  
  try {
    const body = await request.json()
    const { mergeGroups } = body // Array of { canonicalName, filenames }
    
    if (!Array.isArray(mergeGroups) || mergeGroups.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'No merge groups provided'
      }, { status: 400 })
    }
    
    let fixedCount = 0
    const results = []
    
    // Process each selected merge group
    for (const group of mergeGroups) {
      const { canonicalName, filenames } = group
      
      if (!canonicalName || !Array.isArray(filenames)) {
        results.push({
          canonicalName,
          success: false,
          error: 'Invalid group data'
        })
        continue
      }
      
      console.log(`🔧 Merging group: ${canonicalName}`)
      console.log(`   Files to update:`, filenames)
      
      let groupFixedCount = 0
      const errors = []
      
      // Update each font in this group
      for (const filename of filenames) {
        try {
          await fontStorageV2.updateFont(filename, {
            family: canonicalName
          })
          groupFixedCount++
          fixedCount++
        } catch (error) {
          console.error(`   Failed to update ${filename}:`, error)
          errors.push(`${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
      
      results.push({
        canonicalName,
        success: errors.length === 0,
        fontsUpdated: groupFixedCount,
        errors: errors.length > 0 ? errors : undefined
      })
    }
    
    console.log(`✅ Selective merge complete. Fixed ${fixedCount} fonts.`)
    
    return NextResponse.json({
      success: true,
      message: `Merged ${fixedCount} fonts in ${mergeGroups.length} groups`,
      results,
      totalFixed: fixedCount
    })
    
  } catch (error) {
    console.error('❌ Selective merge failed:', error)
    return NextResponse.json({
      success: false,
      error: 'MERGE_FAILED',
      message: 'Failed to merge selected families',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}