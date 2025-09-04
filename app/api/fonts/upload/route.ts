import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('📤 Font upload request received')
  
  // Import modules inside the function to catch any import errors
  try {
    console.log('📦 Loading font parser and storage modules...')
    const { parseFontFile } = await import('@/lib/font-parser')
    const { blobOnlyStorage } = await import('@/lib/blob-only-storage')
    console.log('✅ Modules loaded successfully')
    const formData = await request.formData()
    console.log('📋 Form data parsed successfully')
    
    const file = formData.get('file') as File
    const targetFamily = formData.get('targetFamily') as string | null || formData.get('familyName') as string | null
    
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
    if (targetFamily) {
      console.log(`🎯 Target family: ${targetFamily}`)
    }

    // Get file data
    const bytes = await file.arrayBuffer()
    
    // Parse font metadata
    console.log('🔍 Starting font parsing...')
    const fontMetadata = await parseFontFile(bytes, file.name, file.size)
    console.log('✅ Font parsing completed')
    
    // If uploading to existing family, inherit family metadata
    if (targetFamily) {
      try {
        const existingFonts = await blobOnlyStorage.getAllFonts()
        const familyFonts = existingFonts.filter(f => f.family === targetFamily)
        
        if (familyFonts.length > 0) {
          // Use the most recent font's family-level metadata
          const representativeFont = familyFonts.sort((a, b) => 
            new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
          )[0]
          
          console.log(`🔄 Inheriting family metadata from: ${representativeFont.filename}`)
          
          // Override the parsed metadata with family-level settings
          fontMetadata.category = representativeFont.category
          fontMetadata.foundry = representativeFont.foundry
          fontMetadata.languages = representativeFont.languages
          fontMetadata.openTypeFeatures = [...new Set([
            ...fontMetadata.openTypeFeatures, 
            ...representativeFont.openTypeFeatures
          ])]
          fontMetadata.price = representativeFont.price
          fontMetadata.downloadLink = representativeFont.downloadLink
          
          // Force the family name to match the target
          fontMetadata.family = targetFamily
          fontMetadata.name = targetFamily
        }
      } catch (error) {
        console.warn(`⚠️ Failed to load existing family metadata: ${error}`)
      }
    }
    
    // Store font using blob-only storage manager
    console.log('💾 Storing font in blob-only storage...')
    const storedFont = await blobOnlyStorage.storeFont(fontMetadata, bytes)
    console.log('✅ Font stored successfully')
    
    // Log storage type for debugging
    const storageInfo = blobOnlyStorage.getStorageInfo()
    console.log(`📊 Storage used: ${storageInfo.type} (${storageInfo.fontsCount} total fonts)`)
    
    return NextResponse.json({ 
      success: true, 
      message: `Font uploaded successfully${targetFamily ? ` to ${targetFamily} family` : ''}`,
      font: storedFont,
      inheritedMetadata: targetFamily ? true : false
    })

  } catch (error) {
    console.error('❌ Upload error:', error)
    console.error('📁 Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({ 
      error: 'Font upload failed', 
      details: errorMessage,
      timestamp: new Date().toISOString(),
      troubleshooting: {
        supportedFormats: ['TTF', 'OTF'],
        maxFileSize: '10MB',
        commonIssues: [
          'File might be corrupted',
          'Font format not supported by OpenType.js',
          'File is not a valid font file',
          'Blob storage module loading failed'
        ]
      }
    }, { status: 500 })
  } catch (moduleError) {
    console.error('❌ Module loading error:', moduleError)
    return NextResponse.json({ 
      error: 'Module loading failed', 
      details: moduleError instanceof Error ? moduleError.message : 'Unknown module error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}