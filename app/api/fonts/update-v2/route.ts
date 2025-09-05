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
    const success = await fontStorageV2.updateFont(filename, updates)
    
    if (!success) {
      return NextResponse.json({ error: 'Font not found or update failed' }, { status: 404 })
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