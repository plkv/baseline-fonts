import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('📤 Font upload request received')
  
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    console.log(`📂 File: ${file.name} (${file.size} bytes)`)
    
    // Basic validation
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ 
        error: 'File too large. Maximum 10MB allowed.' 
      }, { status: 400 })
    }
    
    // Import and use modules
    const { parseFontFile } = await import('@/lib/font-parser')
    const { fontStorageV2 } = await import('@/lib/font-storage-v2')
    
    // Get file data
    const bytes = await file.arrayBuffer()
    console.log('📦 File data loaded')
    
    // Parse font
    const fontMetadata = await parseFontFile(bytes, file.name, file.size)
    console.log(`🔍 Font parsed: ${fontMetadata.family}`)
    
    // Store font using V2 storage
    const storedFont = await fontStorageV2.storeFont(fontMetadata, bytes)
    console.log('💾 Font stored successfully')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Font uploaded successfully',
      font: storedFont
    })

  } catch (error) {
    console.error('❌ Upload error:', error)
    
    return NextResponse.json({ 
      error: 'Upload failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}