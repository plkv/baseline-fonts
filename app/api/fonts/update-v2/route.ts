import { NextRequest, NextResponse } from 'next/server'
import { fontStorageV2 } from '@/lib/font-storage-v2'

export async function PATCH(request: NextRequest) {
  console.log('🔧 V2 Font update endpoint called')
  
  try {
    const body = await request.json()
    const { filename, updates } = body
    
    console.log('🔧 V2 Update request:', { filename, updates })
    
    if (!filename) {
      console.log('❌ No filename provided')
      return NextResponse.json({ error: 'Filename required' }, { status: 400 })
    }

    // Use V2 storage directly - no Redis needed
    console.log('🔍 Attempting to update font with V2 storage...')
    
    // First, check if font exists
    const allFonts = await fontStorageV2.getAllFonts()
    console.log(`📋 Found ${allFonts.length} fonts in V2 storage`)
    console.log(`🔍 Looking for filename: "${filename}"`)
    console.log(`📝 Available filenames:`, allFonts.map(f => f.filename))
    
    const foundFont = allFonts.find(f => f.filename === filename)
    if (!foundFont) {
      return NextResponse.json({ 
        error: 'Font not found', 
        filename: filename,
        available: allFonts.map(f => f.filename).slice(0, 3)
      }, { status: 404 })
    }
    
    console.log(`✅ Found font: ${foundFont.family}`)
    const success = await fontStorageV2.updateFont(filename, updates)
    
    if (!success) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }
    
    console.log('✅ Font updated successfully in V2 storage')
    return NextResponse.json({ 
      success: true, 
      message: `Font updated successfully`
    })
    
  } catch (error) {
    console.error('❌ V2 Update error:', error)
    return NextResponse.json({ 
      error: 'Font update failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}