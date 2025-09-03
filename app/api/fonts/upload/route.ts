import { NextRequest, NextResponse } from 'next/server'
import { parseFontFile } from '@/lib/font-parser'
import { vercelFontStorage } from '@/lib/vercel-font-storage'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Basic file validation
    const allowedTypes = ['font/ttf', 'font/otf', 'application/x-font-ttf', 'application/x-font-otf']
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(ttf|otf)$/i)) {
      return NextResponse.json({ error: 'Invalid file type. Only TTF and OTF files allowed.' }, { status: 400 })
    }

    // Get file data
    const bytes = await file.arrayBuffer()
    
    // Parse font metadata
    const fontMetadata = await parseFontFile(bytes, file.name, file.size)
    
    // Store font file and metadata using Vercel storage
    const storedFont = await vercelFontStorage.addFont(fontMetadata, bytes)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Font uploaded to Vercel storage successfully',
      font: storedFont
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ 
      error: 'Font parsing failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}