import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export async function GET(request: NextRequest) {
  try {
    const families = await fontStorageClean.getAllFamilies()
    
    return NextResponse.json({ 
      success: true, 
      families 
    })

  } catch (error) {
    console.error('Get families error:', error)
    return NextResponse.json({ 
      error: 'Failed to get font families',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}