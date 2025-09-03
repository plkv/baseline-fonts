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
    const allowedTypes = ['font/ttf', 'font/otf', 'application/x-font-ttf', 'application/x-font-otf', 'application/octet-stream']
    const hasValidExtension = file.name.match(/\.(ttf|otf)$/i)
    
    if (!allowedTypes.includes(file.type) && !hasValidExtension) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only TTF and OTF files allowed.',
        details: `Received type: ${file.type}, filename: ${file.name}`
      }, { status: 400 })
    }
    
    // File size check (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File too large. Maximum file size is 10MB.',
        details: `File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`
      }, { status: 400 })
    }
    
    console.log(`📂 Uploading font: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(1)}KB)`)

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
    console.error('❌ Upload error:', error)
    console.error('📁 Request details:', {
      fileName: file?.name || 'No file',
      fileSize: file?.size || 0,
      fileType: file?.type || 'Unknown'
    })
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({ 
      error: 'Font upload failed', 
      details: errorMessage,
      troubleshooting: {
        supportedFormats: ['TTF', 'OTF'],
        maxFileSize: '10MB',
        commonIssues: [
          'File might be corrupted',
          'Font format not supported by OpenType.js',
          'File is not a valid font file'
        ]
      }
    }, { status: 500 })
  }
}