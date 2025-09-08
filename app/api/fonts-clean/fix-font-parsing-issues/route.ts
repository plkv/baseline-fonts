import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Fixing font parsing issues...')
    
    const allFonts = await fontStorageClean.getAllFonts()
    console.log(`Found ${allFonts.length} fonts to process`)
    
    const results = []
    let updatedCount = 0
    let errorCount = 0
    
    for (const font of allFonts) {
      try {
        console.log(`\n🔍 Processing: ${font.family} - ${font.style} (${font.filename})`)
        
        let hasUpdates = false
        const updates: any = {}
        
        // Download the original font file from blob storage for re-parsing
        const response = await fetch(font.blobUrl)
        if (!response.ok) {
          throw new Error(`Failed to download font: ${response.statusText}`)
        }
        
        const buffer = await response.arrayBuffer()
        console.log(`  📁 Downloaded ${buffer.byteLength} bytes`)
        
        // Re-parse the font with enhanced parser
        const { parseFontFile } = await import('@/lib/font-parser')
        const parsedData = await parseFontFile(buffer, font.filename, font.fileSize)
        
        // 1. Fix stylistic set names
        const oldFeatures = font.openTypeFeatures || []
        const newFeatures = parsedData.openTypeFeatures || []
        
        if (JSON.stringify(oldFeatures) !== JSON.stringify(newFeatures)) {
          updates.openTypeFeatures = newFeatures
          hasUpdates = true
          console.log(`  🎨 Updated OpenType features: ${oldFeatures.length} → ${newFeatures.length}`)
        }
        
        // 2. Fix incorrect style names based on filename and metadata
        let correctedStyle = parsedData.style || font.style
        let correctedWeight = parsedData.weight || font.weight
        
        // Special handling for common problematic fonts
        if (font.family === 'Jost') {
          // Extract weight and style from Jost filename pattern: Jost-[weight]-[style].otf
          const match = font.filename.match(/Jost-(\d+)-(.*?)(?:Italic)?\.otf$/)
          if (match) {
            const weightNum = parseInt(match[1])
            const stylePart = match[2]
            
            // Map weight numbers to proper style names for Jost
            const weightToStyle: { [key: number]: string } = {
              100: 'Thin',
              200: 'Thin', 
              300: 'Light',
              400: 'Book',
              500: 'Medium', 
              600: 'Semi',
              700: 'Bold',
              900: 'Black'
            }
            
            correctedStyle = weightToStyle[weightNum] || stylePart
            correctedWeight = weightNum
            
            // Handle italic variants
            if (font.filename.includes('Italic')) {
              correctedStyle += ' Italic'
            }
          }
        }
        
        if (font.family === 'Basteleur') {
          // Extract style from Basteleur filename: Basteleur-[style].otf
          const match = font.filename.match(/Basteleur-(.*?)\.otf$/)
          if (match) {
            const stylePart = match[1]
            if (stylePart === 'Moonlight') {
              correctedStyle = 'Moonlight'
              correctedWeight = 300
            } else if (stylePart === 'Bold') {
              correctedStyle = 'Bold'
              correctedWeight = 700
            }
          }
        }
        
        if (font.family === 'Outward') {
          // Extract style from Outward filename: outward-[style].ttf
          const match = font.filename.match(/outward-(.*?)\.ttf$/)
          if (match) {
            const stylePart = match[1]
            correctedStyle = stylePart.charAt(0).toUpperCase() + stylePart.slice(1) // Capitalize
          }
        }
        
        // Update style if it changed
        if (correctedStyle !== font.style) {
          updates.style = correctedStyle
          hasUpdates = true
          console.log(`  📝 Updated style: "${font.style}" → "${correctedStyle}"`)
        }
        
        // Update weight if it changed  
        if (correctedWeight !== font.weight) {
          updates.weight = correctedWeight
          hasUpdates = true
          console.log(`  ⚖️ Updated weight: ${font.weight} → ${correctedWeight}`)
        }
        
        // 3. Fix family grouping for fonts like Jost that got split
        if (font.family === 'Jost') {
          // All Jost fonts should have the same familyId
          const correctFamilyId = 'family_jost'
          if (font.familyId !== correctFamilyId) {
            updates.familyId = correctFamilyId
            hasUpdates = true
            console.log(`  👨‍👩‍👧‍👦 Updated familyId: "${font.familyId}" → "${correctFamilyId}"`)
          }
        }
        
        if (font.family === 'Basteleur') {
          // All Basteleur fonts should have the same familyId
          const correctFamilyId = 'family_basteleur'
          if (font.familyId !== correctFamilyId) {
            updates.familyId = correctFamilyId
            hasUpdates = true
            console.log(`  👨‍👩‍👧‍👦 Updated familyId: "${font.familyId}" → "${correctFamilyId}"`)
          }
        }
        
        // Apply updates if any were found
        if (hasUpdates) {
          const success = await fontStorageClean.updateFont(font.id, updates)
          
          if (success) {
            updatedCount++
            results.push({
              id: font.id,
              family: font.family,
              style: font.style,
              filename: font.filename,
              updates,
              success: true
            })
            console.log(`  ✅ Successfully updated`)
          } else {
            console.log(`  ❌ Failed to update database`)
            results.push({
              id: font.id,
              family: font.family,
              style: font.style,
              filename: font.filename,
              updates,
              success: false,
              error: 'Database update failed'
            })
          }
        } else {
          console.log(`  ℹ️ No updates needed`)
          results.push({
            id: font.id,
            family: font.family,
            style: font.style,
            filename: font.filename,
            updates: {},
            success: true,
            message: 'No changes needed'
          })
        }
        
      } catch (error) {
        errorCount++
        console.log(`  ❌ Error processing ${font.filename}: ${error}`)
        results.push({
          id: font.id,
          family: font.family,
          style: font.style,
          filename: font.filename,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    console.log(`\n🎉 Font parsing fixes complete!`)
    console.log(`   📊 Total fonts: ${allFonts.length}`)
    console.log(`   ✅ Updated: ${updatedCount}`)
    console.log(`   ❌ Errors: ${errorCount}`)
    console.log(`   ℹ️ No changes: ${allFonts.length - updatedCount - errorCount}`)
    
    return NextResponse.json({
      success: true,
      message: `Fixed font parsing issues for ${allFonts.length} fonts, updated ${updatedCount}`,
      stats: {
        total: allFonts.length,
        updated: updatedCount,
        errors: errorCount,
        noChanges: allFonts.length - updatedCount - errorCount
      },
      results: results.filter(r => Object.keys(r.updates || {}).length > 0) // Only return fonts with changes
    })
    
  } catch (error) {
    console.error('❌ Font parsing fix error:', error)
    return NextResponse.json({
      success: false,
      error: 'FONT_PARSING_FIX_FAILED',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}