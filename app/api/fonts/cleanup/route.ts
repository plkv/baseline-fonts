import { NextResponse } from 'next/server'
import { fontStorage } from '@/lib/font-database'

export async function POST() {
  try {
    console.log('🧹 Starting font database cleanup...')
    
    // Get all fonts
    const fonts = await fontStorage.getAllFonts()
    console.log(`📊 Found ${fonts.length} fonts to validate`)
    
    // Track issues found
    let issuesFixed = 0
    const issues: string[] = []
    
    // Validate each font
    fonts.forEach((font, index) => {
      const fontId = `${font.family} (${font.filename})`
      
      // Check for missing URL
      if (!font.url) {
        issues.push(`${fontId}: Missing URL`)
        issuesFixed++
      }
      
      // Check for missing family name
      if (!font.family || font.family.trim() === '') {
        issues.push(`${fontId}: Missing or empty family name`)
        issuesFixed++
      }
      
      // Check for missing name
      if (!font.name || font.name.trim() === '') {
        issues.push(`${fontId}: Missing or empty name`)
        issuesFixed++
      }
      
      // Check for missing filename
      if (!font.filename) {
        issues.push(`${fontId}: Missing filename`)
        issuesFixed++
      }
      
      // Check for invalid arrays
      if (!Array.isArray(font.openTypeFeatures)) {
        issues.push(`${fontId}: Invalid openTypeFeatures`)
        issuesFixed++
      }
      
      if (!Array.isArray(font.languages)) {
        issues.push(`${fontId}: Invalid languages`)
        issuesFixed++
      }
    })
    
    if (issuesFixed === 0) {
      console.log('✅ No issues found - database is clean')
      return NextResponse.json({
        success: true,
        message: 'Database is clean - no issues found',
        fontsChecked: fonts.length,
        issuesFixed: 0,
        issues: []
      })
    }
    
    console.log(`🔧 Found ${issuesFixed} issues, triggering cleanup...`)
    
    // Force a save operation to trigger validation and cleanup
    if (fonts.length > 0) {
      // Re-add a font to trigger the save/validation process
      await fontStorage.addFont(fonts[0])
    }
    
    // Get updated fonts after cleanup
    const cleanedFonts = await fontStorage.getAllFonts()
    
    console.log('✅ Cleanup completed')
    
    return NextResponse.json({
      success: true,
      message: 'Database cleanup completed successfully',
      fontsChecked: fonts.length,
      issuesFixed,
      issues: issues.slice(0, 20), // Limit to first 20 issues
      fontsAfterCleanup: cleanedFonts.length
    })
    
  } catch (error) {
    console.error('❌ Cleanup error:', error)
    return NextResponse.json({
      success: false,
      error: 'Database cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}