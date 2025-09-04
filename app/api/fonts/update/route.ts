import { NextRequest, NextResponse } from 'next/server'
import { persistentStorage } from '@/lib/persistent-storage'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { filename, updates } = body
    
    if (!filename) {
      return NextResponse.json({ error: 'Filename required' }, { status: 400 })
    }

    // Update font using persistent storage
    const success = await persistentStorage.updateFont(filename, updates)
    
    if (!success) {
      return NextResponse.json({ error: 'Font not found' }, { status: 404 })
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