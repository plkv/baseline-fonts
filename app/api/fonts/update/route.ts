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

    // For now, just simulate success to test the flow
    // We'll implement the actual update logic after confirming the endpoint works
    console.log('✅ Simulating successful update for:', filename)
    
    return NextResponse.json({ 
      success: true, 
      message: `Font ${filename} updated successfully (simulated)`,
      received: { filename, updates }
    })
  } catch (error) {
    console.error('❌ Update error:', error)
    return NextResponse.json({ 
      error: 'Font update failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}