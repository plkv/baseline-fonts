import { NextRequest, NextResponse } from 'next/server'
import { persistentStorage } from '@/lib/persistent-storage'

export async function PATCH(request: NextRequest) {
  try {
    const { filename, published } = await request.json()
    
    if (!filename || typeof published !== 'boolean') {
      return NextResponse.json({ 
        error: 'Filename and published status are required' 
      }, { status: 400 })
    }

    // Update publish status using persistent storage
    const success = await persistentStorage.updateFont(filename, { published })
    
    if (!success) {
      return NextResponse.json({ error: 'Font not found' }, { status: 404 })
    }
    
    // Get updated font for response
    const fonts = await persistentStorage.getAllFonts()
    const updatedFont = fonts.find(f => f.filename === filename)
    
    const action = published ? 'published' : 'unpublished'
    return NextResponse.json({ 
      success: true, 
      message: `Font ${action} successfully`,
      font: updatedFont
    })
  } catch (error) {
    console.error('Publish error:', error)
    return NextResponse.json({ 
      error: 'Font publish status update failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}