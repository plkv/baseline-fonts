import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

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

    // Get current font metadata from KV
    console.log('📋 Getting font from KV:', filename)
    const current = await kv.hget('fonts', filename)
    
    if (!current) {
      console.log('❌ Font not found in KV:', filename)
      return NextResponse.json({ error: 'Font not found' }, { status: 404 })
    }
    
    console.log('✅ Current font data:', current)
    
    // Update and save back to KV
    const updated = { ...current, ...updates }
    console.log('🔧 Saving updated font:', updated)
    
    await kv.hset('fonts', { [filename]: updated })
    
    console.log('✅ Font updated successfully in KV')
    
    return NextResponse.json({ 
      success: true, 
      message: `Font ${filename} updated successfully`,
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