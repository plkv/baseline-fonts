import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('🔧 Font URL repair request')
  
  try {
    const { blobOnlyStorage } = await import('@/lib/blob-only-storage')
    
    const allFonts = await blobOnlyStorage.getAllFonts()
    console.log(`📋 Found ${allFonts.length} fonts to check`)
    
    let repaired = 0
    
    for (const font of allFonts) {
      let needsRepair = false
      let updates: any = {}
      
      // Check if URL is missing or broken
      if (!font.url && font.storage === 'vercel-blob') {
        // Try to reconstruct the blob URL from the filename
        try {
          const blobModule = await import('@vercel/blob')
          const { blobs } = await blobModule.list({ prefix: `fonts/${font.filename}` })
          const fontBlob = blobs.find(b => b.pathname === `fonts/${font.filename}`)
          
          if (fontBlob) {
            updates.url = fontBlob.url
            needsRepair = true
            console.log(`🔗 Found URL for ${font.filename}: ${fontBlob.url}`)
          } else {
            console.warn(`⚠️ No blob found for ${font.filename}`)
          }
        } catch (error) {
          console.error(`❌ Failed to get blob URL for ${font.filename}:`, error)
        }
      }
      
      // Apply repairs if needed
      if (needsRepair) {
        await blobOnlyStorage.updateFont(font.filename, updates)
        repaired++
        console.log(`✅ Repaired ${font.filename}`)
      }
    }
    
    console.log(`🔧 Font URL repair completed: ${repaired}/${allFonts.length} fonts repaired`)
    
    return NextResponse.json({ 
      success: true,
      message: `Repaired URLs for ${repaired} fonts`,
      totalFonts: allFonts.length,
      repairedFonts: repaired
    })

  } catch (error) {
    console.error('❌ Font URL repair error:', error)
    
    return NextResponse.json({ 
      error: 'Font URL repair failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}