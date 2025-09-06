import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, updates } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Font ID required' }, { status: 400 })
    }

    const success = await fontStorageClean.updateFont(id, updates)
    
    if (!success) {
      return NextResponse.json({ error: 'Font not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Font updated successfully'
    })

  } catch (error) {
    console.error('Update error:', error)
    return NextResponse.json({ 
      error: 'Update failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}