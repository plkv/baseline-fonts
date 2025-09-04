import { NextResponse } from 'next/server'
import { fontStorage } from '@/lib/font-database'

export async function GET() {
  try {
    const fonts = await fontStorage.getAllFonts()
    return NextResponse.json({ 
      success: true, 
      fonts 
    })
  } catch (error) {
    console.error('Failed to load fonts:', error)
    return NextResponse.json({ error: 'Failed to load fonts' }, { status: 500 })
  }
}