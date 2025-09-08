import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting collection consistency fix...')
    
    // Get all fonts
    const allFonts = await fontStorageClean.getAllFonts()
    
    // Group by family
    const fontsByFamily = new Map<string, any[]>()
    allFonts.forEach(font => {
      const familyName = font.family
      if (!fontsByFamily.has(familyName)) {
        fontsByFamily.set(familyName, [])
      }
      fontsByFamily.get(familyName)!.push(font)
    })
    
    // Find families with mixed collections
    const mixedFamilies: any[] = []
    const fixLog: string[] = []
    
    for (const [familyName, familyFonts] of fontsByFamily.entries()) {
      const collections = [...new Set(familyFonts.map(f => f.collection || 'Text'))]
      
      if (collections.length > 1) {
        mixedFamilies.push({
          family: familyName,
          collections,
          fonts: familyFonts.map(f => ({ id: f.id, style: f.style, collection: f.collection }))
        })
        
        // Fix strategy: Use the collection of the default style or first non-Text collection
        const targetCollection = 
          familyFonts.find(f => f.isDefaultStyle)?.collection ||
          familyFonts.find(f => f.collection === 'Display')?.collection ||
          familyFonts.find(f => f.collection === 'Weirdo')?.collection ||
          'Text'
        
        console.log(`🔄 Fixing family "${familyName}": ${collections.join(', ')} → ${targetCollection}`)
        fixLog.push(`${familyName}: ${collections.join(', ')} → ${targetCollection}`)
        
        // Update all fonts in this family to use the target collection
        for (const font of familyFonts) {
          if (font.collection !== targetCollection) {
            await fontStorageClean.updateFont(font.id, { collection: targetCollection })
            console.log(`  ✅ Updated ${font.style} → ${targetCollection}`)
          }
        }
      }
    }
    
    console.log(`✅ Collection fix complete. Fixed ${mixedFamilies.length} families.`)
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${mixedFamilies.length} families with mixed collections`,
      mixedFamilies,
      fixLog,
      totalFamilies: fontsByFamily.size,
      totalFonts: allFonts.length
    })
    
  } catch (error) {
    console.error('❌ Collection fix error:', error)
    return NextResponse.json({
      success: false,
      error: 'COLLECTION_FIX_FAILED',
      message: 'Failed to fix collection consistency',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Analysis only - don't fix
    const allFonts = await fontStorageClean.getAllFonts()
    
    // Group by family and find mixed collections
    const fontsByFamily = new Map<string, any[]>()
    allFonts.forEach(font => {
      const familyName = font.family
      if (!fontsByFamily.has(familyName)) {
        fontsByFamily.set(familyName, [])
      }
      fontsByFamily.get(familyName)!.push(font)
    })
    
    const mixedFamilies: any[] = []
    for (const [familyName, familyFonts] of fontsByFamily.entries()) {
      const collections = [...new Set(familyFonts.map(f => f.collection || 'Text'))]
      
      if (collections.length > 1) {
        mixedFamilies.push({
          family: familyName,
          collections,
          fonts: familyFonts.map(f => ({ id: f.id, style: f.style, collection: f.collection }))
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      mixedFamilies,
      totalMixed: mixedFamilies.length,
      totalFamilies: fontsByFamily.size,
      collectionStats: {
        Text: allFonts.filter(f => (f.collection || 'Text') === 'Text').length,
        Display: allFonts.filter(f => f.collection === 'Display').length,
        Weirdo: allFonts.filter(f => f.collection === 'Weirdo').length
      }
    })
    
  } catch (error) {
    console.error('❌ Collection analysis error:', error)
    return NextResponse.json({
      success: false,
      error: 'ANALYSIS_FAILED',
      message: 'Failed to analyze collections',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}