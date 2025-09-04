import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('🔍 Storage diagnostic request')
  
  try {
    // Basic environment check without imports
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV || 'undefined',
      VERCEL: process.env.VERCEL || 'undefined', 
      BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN ? 'SET' : 'MISSING',
      isProduction: process.env.NODE_ENV === 'production' && process.env.VERCEL === '1',
      hasBlob: !!process.env.BLOB_READ_WRITE_TOKEN
    }
    
    console.log('Environment check:', envCheck)
    
    // Try to import storage module
    let storageStatus = 'Unknown'
    let fontsCount = 0
    let storageError = null
    
    try {
      const { blobOnlyStorage } = await import('@/lib/blob-only-storage')
      const storageInfo = blobOnlyStorage.getStorageInfo()
      const allFonts = await blobOnlyStorage.getAllFonts()
      
      storageStatus = storageInfo.type
      fontsCount = allFonts.length
      
      console.log(`Storage type: ${storageStatus}, Fonts: ${fontsCount}`)
    } catch (error) {
      storageError = error instanceof Error ? error.message : 'Unknown storage error'
      console.error('Storage module error:', storageError)
    }
    
    // Try blob module directly
    let blobModuleStatus = 'Unknown'
    try {
      await import('@vercel/blob')
      blobModuleStatus = 'Available'
    } catch (error) {
      blobModuleStatus = `Error: ${error instanceof Error ? error.message : 'Unknown'}`
    }
    
    const diagnostic = {
      timestamp: new Date().toISOString(),
      environment: envCheck,
      storageType: storageStatus,
      fontsCount: fontsCount,
      blobModule: blobModuleStatus,
      storageError: storageError,
      criticalIssues: []
    }
    
    // Identify critical issues
    if (!envCheck.hasBlob && envCheck.isProduction) {
      diagnostic.criticalIssues.push('MISSING BLOB_READ_WRITE_TOKEN in production')
    }
    
    if (storageStatus.includes('Memory Only')) {
      diagnostic.criticalIssues.push('Fonts stored in memory only - WILL BE LOST')
    }
    
    console.log('Full diagnostic:', diagnostic)
    
    return NextResponse.json(diagnostic)

  } catch (error) {
    console.error('❌ Diagnostic error:', error)
    
    return NextResponse.json({ 
      error: 'Diagnostic failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}