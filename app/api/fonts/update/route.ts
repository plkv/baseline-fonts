import { NextRequest, NextResponse } from 'next/server'
import { fontStorageV2 } from '@/lib/font-storage-v2'

export async function PATCH(request: NextRequest) {
  console.log('🔧 Font update endpoint called')
  
  try {
    const body = await request.json()
    const { filename, updates } = body
    
    console.log('🔧 Update request:', { filename, updates })
    
    if (!filename) {
      console.log('❌ No filename provided')
      return NextResponse.json({ error: 'Filename required' }, { status: 400 })
    }

    // Check if KV is available
    const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
    console.log('🔧 KV available:', hasKV)

    if (hasKV) {
      // Use KV if available
      try {
        const { kv } = await import('@vercel/kv')
        const current = await kv.hget('fonts', filename)
        
        if (!current) {
          console.log('❌ Font not found in KV:', filename)
          return NextResponse.json({ error: 'Font not found' }, { status: 404 })
        }
        
        const updated = { ...current, ...updates }
        await kv.hset('fonts', { [filename]: updated })
        
        console.log('✅ Font updated successfully in KV')
        return NextResponse.json({ 
          success: true, 
          message: `Font ${filename} updated successfully`,
          updated: updated
        })
      } catch (kvError) {
        console.warn('⚠️ KV failed, falling back to V2:', kvError)
      }
    }

    // Fallback to V2 storage
    console.log('📋 Using V2 storage fallback')
    const success = await fontStorageV2.updateFont(filename, updates)
    
    if (!success) {
      return NextResponse.json({ error: 'Font not found' }, { status: 404 })
    }
    
    console.log('✅ Font updated successfully in V2 storage')
    return NextResponse.json({ 
      success: true, 
      message: `Font ${filename} updated successfully (V2 fallback)`,
      updated: updates
    })
    
  } catch (error) {
    console.error('❌ Update error:', error)
    return NextResponse.json({ 
      error: 'Font update failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}