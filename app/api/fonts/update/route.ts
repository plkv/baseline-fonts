import { NextRequest, NextResponse } from 'next/server'
import { fontStorage } from '@/lib/font-database'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { filename, updates } = body
    
    if (!filename) {
      return NextResponse.json({ error: 'Filename required' }, { status: 400 })
    }

    // Get all fonts and update the specific one
    const fonts = await fontStorage.getAllFonts()
    const fontIndex = fonts.findIndex(f => f.filename === filename)
    
    if (fontIndex === -1) {
      return NextResponse.json({ error: 'Font not found' }, { status: 404 })
    }
    
    // Update the font metadata
    fonts[fontIndex] = { ...fonts[fontIndex], ...updates }
    
    // Save updated font back
    await fontStorage.addFont(fonts[fontIndex])
    
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