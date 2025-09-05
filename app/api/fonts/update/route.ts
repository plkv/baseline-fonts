import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(request: NextRequest) {
  console.log('🔧 Font update endpoint called')
  console.log('🔧 Environment check - Upstash:', !!process.env.UPSTASH_REDIS_REST_URL, 'KV:', !!process.env.KV_REST_API_URL)
  
  try {
    const body = await request.json()
    const { filename, updates } = body
    
    console.log('🔧 Update request:', { filename, updates })
    
    if (!filename) {
      console.log('❌ No filename provided')
      return NextResponse.json({ error: 'Filename required' }, { status: 400 })
    }

    // **Updated Plan: Use Upstash Redis from Marketplace**
    const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
    
    if (!hasUpstash && !hasKV) {
      return NextResponse.json({ 
        error: 'Redis storage not configured',
        message: 'Please set up Redis storage from Vercel Marketplace',
        setup: 'Go to Vercel Dashboard → Marketplace → Search "Upstash" → Add Redis'
      }, { status: 503 })
    }

    // Use Upstash Redis or legacy KV
    let redis
    if (hasUpstash) {
      console.log('🔧 Using Upstash Redis')
      const { Redis } = await import('@upstash/redis')
      redis = Redis.fromEnv()
    } else {
      console.log('🔧 Using legacy Vercel KV')
      const { kv } = await import('@vercel/kv')
      redis = kv
    }
    
    // Get current font
    const current = await redis.hget('fonts', filename)
    
    if (!current) {
      // Try to migrate from V2 on-demand
      console.log('🔄 Font not in Redis, checking V2 for migration...')
      try {
        const { fontStorageV2 } = await import('@/lib/font-storage-v2')
        const allFonts = await fontStorageV2.getAllFonts()
        const v2Font = allFonts.find(f => f.filename === filename)
        
        if (v2Font) {
          console.log('📋 Migrating font from V2 to Redis:', filename)
          await redis.hset('fonts', { [filename]: v2Font })
          
          // Now update with new data
          const updated = { ...v2Font, ...updates }
          await redis.hset('fonts', { [filename]: updated })
          
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
    
    // Update in Redis
    const updated = { ...current, ...updates }
    await redis.hset('fonts', { [filename]: updated })
    
    console.log('✅ Font updated successfully in Redis')
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