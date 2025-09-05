import { NextRequest, NextResponse } from 'next/server'

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

    // **Simple Plan: Require KV setup**
    const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
    
    if (!hasKV) {
      return NextResponse.json({ 
        error: 'KV storage not configured',
        message: 'Please set up Vercel KV database in dashboard',
        setup: 'Go to Vercel Dashboard → Storage → Create KV Database'
      }, { status: 503 })
    }

    // Use KV (simple, reliable)
    const { kv } = await import('@vercel/kv')
    
    // Get current font
    const current = await kv.hget('fonts', filename)
    
    if (!current) {
      // Try to migrate from V2 on-demand
      console.log('🔄 Font not in KV, checking V2 for migration...')
      try {
        const { fontStorageV2 } = await import('@/lib/font-storage-v2')
        const allFonts = await fontStorageV2.getAllFonts()
        const v2Font = allFonts.find(f => f.filename === filename)
        
        if (v2Font) {
          console.log('📋 Migrating font from V2 to KV:', filename)
          await kv.hset('fonts', { [filename]: v2Font })
          
          // Now update with new data
          const updated = { ...v2Font, ...updates }
          await kv.hset('fonts', { [filename]: updated })
          
          return NextResponse.json({ 
            success: true, 
            message: `Font migrated and updated successfully`,
            updated: updated
          })
        }
      } catch (migrationError) {
        console.warn('⚠️ Migration failed:', migrationError)
      }
      
      return NextResponse.json({ error: 'Font not found' }, { status: 404 })
    }
    
    // Update in KV
    const updated = { ...current, ...updates }
    await kv.hset('fonts', { [filename]: updated })
    
    console.log('✅ Font updated successfully in KV')
    return NextResponse.json({ 
      success: true, 
      message: `Font updated successfully`,
      updated: updated
    })
    
  } catch (error) {
    console.error('❌ Update error:', error)
    return NextResponse.json({ 
      error: 'Font update failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}