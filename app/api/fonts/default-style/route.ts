import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('🎯 Default style management request received')
  
  try {
    const { blobOnlyStorage } = await import('@/lib/blob-only-storage')
    
    const body = await request.json()
    const { familyName, defaultFilename } = body
    
    if (!familyName || !defaultFilename) {
      return NextResponse.json({ 
        error: 'Family name and default filename are required' 
      }, { status: 400 })
    }

    console.log(`🔄 Setting ${defaultFilename} as default for family: ${familyName}`)
    
    // Get all fonts in the family
    const allFonts = await blobOnlyStorage.getAllFonts()
    const familyFonts = allFonts.filter(f => f.family === familyName)
    
    if (familyFonts.length === 0) {
      return NextResponse.json({ 
        error: 'Font family not found' 
      }, { status: 404 })
    }
    
    const targetFont = familyFonts.find(f => f.filename === defaultFilename)
    if (!targetFont) {
      return NextResponse.json({ 
        error: 'Target font not found in family' 
      }, { status: 404 })
    }
    
    // Update all fonts in family: remove default from others, set default on target
    let updated = 0
    for (const font of familyFonts) {
      const shouldBeDefault = font.filename === defaultFilename
      if (font.defaultStyle !== shouldBeDefault) {
        await blobOnlyStorage.updateFont(font.filename, { defaultStyle: shouldBeDefault })
        updated++
        console.log(`  ✅ Updated ${font.filename}: default=${shouldBeDefault}`)
      }
    }
    
    console.log(`✅ Default style management completed: ${updated} fonts updated`)
    
    return NextResponse.json({ 
      success: true,
      message: `${targetFont.name} set as default for ${familyName}`,
      updatedFonts: updated
    })

  } catch (error) {
    console.error('❌ Default style management error:', error)
    
    return NextResponse.json({ 
      error: 'Default style management failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}