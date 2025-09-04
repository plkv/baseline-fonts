import { NextRequest, NextResponse } from 'next/server'
import { fontStorage } from '@/lib/font-database'

export async function PATCH(request: NextRequest) {
  try {
    const { filename, published } = await request.json()
    
    if (!filename || typeof published !== 'boolean') {
      return NextResponse.json({ 
        error: 'Filename and published status are required' 
      }, { status: 400 })
    }

    // Get all fonts and update the specific one
    const fonts = await fontStorage.getAllFonts()
    const fontIndex = fonts.findIndex(f => f.filename === filename)
    
    if (fontIndex === -1) {
      return NextResponse.json({ error: 'Font not found' }, { status: 404 })
    }
    
    // Update the font's published status
    fonts[fontIndex] = { ...fonts[fontIndex], published }
    
    // Save updated font back
    await fontStorage.addFont(fonts[fontIndex])
    
    const action = published ? 'published' : 'unpublished'
    return NextResponse.json({ 
      success: true, 
      message: `Font ${action} successfully`,
      font: fonts[fontIndex]
    })
  } catch (error) {
    console.error('Publish error:', error)
    return NextResponse.json({ 
      error: 'Font publish status update failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}