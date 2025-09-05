import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('🔄 Starting V2 to KV migration')
  console.log('🔧 Environment check - Upstash:', !!process.env.UPSTASH_REDIS_REST_URL, 'KV:', !!process.env.KV_REST_API_URL)
  
  try {
    // Check if Redis is configured (Upstash or legacy KV)
    const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
    
    if (!hasUpstash && !hasKV) {
      return NextResponse.json({
        error: 'Redis not configured',
        message: 'Please set up Redis storage from Vercel Marketplace',
        setup: 'Go to Vercel Dashboard → Marketplace → Search "Upstash" → Add Redis'
      }, { status: 503 })
    }

    // Set up Redis client
    let redis
    if (hasUpstash) {
      console.log('🔧 Using Upstash Redis for migration')
      const { Redis } = await import('@upstash/redis')
      redis = Redis.fromEnv()
    } else {
      console.log('🔧 Using legacy Vercel KV for migration')
      const { kv } = await import('@vercel/kv')
      redis = kv
    }
    const { fontStorageV2 } = await import('@/lib/font-storage-v2')
    
    // Get all fonts from V2 storage
    console.log('📋 Loading fonts from V2 storage...')
    const v2Fonts = await fontStorageV2.getAllFonts()
    console.log(`🔍 Found ${v2Fonts.length} fonts in V2 storage`)
    
    if (v2Fonts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No fonts to migrate',
        migrated: 0
      })
    }
    
    // Check what's already in Redis
    const redisKeys = await redis.hkeys('fonts')
    console.log(`🔍 Found ${redisKeys.length} fonts already in Redis:`, redisKeys)
    
    let migrated = 0
    let skipped = 0
    const results = []
    
    // Migrate each font
    for (const font of v2Fonts) {
      try {
        if (redisKeys.includes(font.filename)) {
          console.log(`⏭️ Skipping ${font.filename} (already in Redis)`)
          skipped++
          results.push({
            filename: font.filename,
            status: 'skipped',
            reason: 'already exists'
          })
          continue
        }
        
        console.log(`📤 Migrating ${font.filename}...`)
        await redis.hset('fonts', { [font.filename]: font })
        
        migrated++
        results.push({
          filename: font.filename,
          family: font.family,
          status: 'migrated'
        })
        
        console.log(`✅ Migrated ${font.filename}`)
        
      } catch (error) {
        console.error(`❌ Failed to migrate ${font.filename}:`, error)
        results.push({
          filename: font.filename,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    console.log(`🎉 Migration complete: ${migrated} migrated, ${skipped} skipped`)
    
    return NextResponse.json({
      success: true,
      message: `Migration completed successfully`,
      stats: {
        total: v2Fonts.length,
        migrated,
        skipped,
        failed: results.filter(r => r.status === 'failed').length
      },
      results
    })
    
  } catch (error) {
    console.error('❌ Migration error:', error)
    return NextResponse.json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}