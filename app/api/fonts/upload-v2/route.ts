/**
 * Font Upload V2 - Bulletproof Implementation
 * 
 * DESIGN PRINCIPLES:
 * 1. Comprehensive error handling
 * 2. Clear error messages
 * 3. No complex logic or edge cases
 * 4. Graceful degradation
 * 5. Proper logging for diagnostics
 */

import { NextRequest, NextResponse } from 'next/server'
import { parseFontFile } from '@/lib/font-parser'
import { fontStorageV2 } from '@/lib/font-storage-v2'

interface UploadError {
  code: string
  message: string
  details?: any
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('🚀 Font upload V2 started')
  
  try {
    // STEP 1: Parse form data
    let formData: FormData
    try {
      formData = await request.formData()
      console.log('✅ Form data parsed')
    } catch (error) {
      throw {
        code: 'FORM_PARSE_ERROR',
        message: 'Failed to parse form data',
        details: error instanceof Error ? error.message : 'Unknown'
      } as UploadError
    }

    // STEP 2: Validate file
    const file = formData.get('file') as File
    if (!file) {
      throw {
        code: 'NO_FILE',
        message: 'No file provided in request'
      } as UploadError
    }

    if (!file.name.match(/\.(ttf|otf|woff|woff2)$/i)) {
      throw {
        code: 'INVALID_FORMAT',
        message: 'Invalid file format. Only TTF, OTF, WOFF, WOFF2 allowed',
        details: { filename: file.name, type: file.type }
      } as UploadError
    }

    if (file.size > 10 * 1024 * 1024) {
      throw {
        code: 'FILE_TOO_LARGE',
        message: 'File too large. Maximum 10MB allowed',
        details: { size: file.size, maxSize: 10 * 1024 * 1024 }
      } as UploadError
    }

    if (file.size < 1000) {
      throw {
        code: 'FILE_TOO_SMALL',
        message: 'File too small to be a valid font',
        details: { size: file.size }
      } as UploadError
    }

    console.log(`📁 File validated: ${file.name} (${Math.round(file.size / 1024)}KB)`)

    // STEP 3: Read file data
    let fileBuffer: ArrayBuffer
    try {
      fileBuffer = await file.arrayBuffer()
      if (!fileBuffer || fileBuffer.byteLength === 0) {
        throw new Error('Empty file buffer')
      }
      console.log('✅ File data loaded')
    } catch (error) {
      throw {
        code: 'FILE_READ_ERROR',
        message: 'Failed to read file data',
        details: error instanceof Error ? error.message : 'Unknown'
      } as UploadError
    }

    // STEP 4: Parse font metadata
    let fontMetadata
    try {
      fontMetadata = await parseFontFile(fileBuffer, file.name, file.size)
      console.log(`🔍 Font parsed: ${fontMetadata.family} (${fontMetadata.style}, ${fontMetadata.weight})`)
    } catch (error) {
      throw {
        code: 'FONT_PARSE_ERROR',
        message: 'Failed to parse font file',
        details: error instanceof Error ? error.message : 'Unknown'
      } as UploadError
    }

    // STEP 5: Store font
    let storedFont
    try {
      storedFont = await fontStorageV2.storeFont(fontMetadata, fileBuffer)
      console.log('✅ Font stored successfully')
    } catch (error) {
      throw {
        code: 'STORAGE_ERROR',
        message: 'Failed to store font',
        details: error instanceof Error ? error.message : 'Unknown'
      } as UploadError
    }

    // STEP 6: Success response
    const duration = Date.now() - startTime
    console.log(`🎉 Font upload completed in ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: `Font "${fontMetadata.family}" uploaded successfully`,
      font: storedFont,
      performance: {
        uploadTime: duration,
        fileSize: file.size
      }
    })

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('❌ Font upload failed:', error)

    // Handle custom upload errors
    if (error && typeof error === 'object' && 'code' in error) {
      const uploadError = error as UploadError
      return NextResponse.json({
        success: false,
        error: uploadError.code,
        message: uploadError.message,
        details: uploadError.details,
        timestamp: new Date().toISOString(),
        performance: {
          failureTime: duration
        }
      }, { status: 400 })
    }

    // Handle unexpected errors
    console.error('❌ Unexpected error:', error)
    return NextResponse.json({
      success: false,
      error: 'UNEXPECTED_ERROR',
      message: 'An unexpected error occurred during upload',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      performance: {
        failureTime: duration
      }
    }, { status: 500 })
  }
}