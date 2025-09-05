import { NextRequest, NextResponse } from 'next/server'
import { fontStorageV2 } from '@/lib/font-storage-v2'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { filename, updates } = body
    
    console.log('🔧 Update request:', { filename, updates })
    
    if (!filename) {
      return NextResponse.json({ error: 'Filename required' }, { status: 400 })
    }

    // First, check if font exists by listing all fonts
    const allFonts = await fontStorageV2.getAllFonts()
    console.log('📋 All fonts:', allFonts.map(f => f.filename))
    
    const fontExists = allFonts.find(f => f.filename === filename)
    if (!fontExists) {
      console.log('❌ Font not found:', filename)
      return NextResponse.json({ error: `Font ${filename} not found` }, { status: 404 })
    }
    
    console.log('✅ Font found, updating:', fontExists.family)

    // Update font using V2 storage
    const success = await fontStorageV2.updateFont(filename, updates)
    
    console.log('🔧 Update result:', success)
    
    if (!success) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Font metadata updated successfully' 
    })
  } catch (error) {
    console.error('Update error:', error)
    return NextResponse.json({ 
      error: 'Font update failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}