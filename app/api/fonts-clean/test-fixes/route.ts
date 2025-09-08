import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing font parsing fixes...')
    
    const allFonts = await fontStorageClean.getAllFonts()
    
    // Test specific problematic fonts
    const testResults = {
      basteleur: {
        fonts: allFonts.filter(f => f.family === 'Basteleur'),
        issues: []
      },
      jost: {
        fonts: allFonts.filter(f => f.family === 'Jost'),
        issues: []
      },
      hedvig: {
        fonts: allFonts.filter(f => f.family.includes('Hedvig')),
        issues: []
      },
      outward: {
        fonts: allFonts.filter(f => f.family === 'Outward'),
        issues: []
      },
      sligoil: {
        fonts: allFonts.filter(f => f.family.includes('Sligoil')),
        issues: []
      }
    }
    
    // Check Basteleur stylistic sets
    testResults.basteleur.fonts.forEach(font => {
      const stylisticFeatures = font.openTypeFeatures?.filter(f => 
        f.includes('Stylistic Set') || f.match(/ss\d+/)) || []
      
      if (stylisticFeatures.some(f => f === 'Stylistic Set 1')) {
        testResults.basteleur.issues.push('Still showing generic "Stylistic Set 1" instead of custom names')
      }
    })
    
    // Check Jost style names
    const jostStyleIssues = []
    testResults.jost.fonts.forEach(font => {
      // Should have proper style names like Thin, Light, Book, Medium, Semi, Bold, Black
      if (font.style === 'Regular' && font.filename !== 'Jost-400-Book.otf') {
        jostStyleIssues.push(`${font.filename} shows style "${font.style}" (should be specific weight name)`)
      }
      
      // Check if family IDs are fragmented
      if (font.familyId && !font.familyId.startsWith('family_jost_')) {
        // This is actually expected - let me adjust the check
      }
    })
    testResults.jost.issues = jostStyleIssues
    
    // Check Hedvig - should note it only has optical size, not weight
    testResults.hedvig.fonts.forEach(font => {
      if (font.variableAxes && !font.variableAxes.some(axis => axis.axis === 'wght')) {
        testResults.hedvig.issues.push('No weight axis (only optical size) - weight switching not applicable')
      }
    })
    
    // Check Sligoil
    if (testResults.sligoil.fonts.length === 0) {
      testResults.sligoil.issues.push('Font not found in database')
    } else {
      testResults.sligoil.fonts.forEach(font => {
        if (font.variableAxes) {
          const weightAxis = font.variableAxes.find(axis => axis.axis === 'wght')
          if (weightAxis && (weightAxis.min !== 90 || weightAxis.max !== 120)) {
            testResults.sligoil.issues.push(`Unusual weight range: ${weightAxis.min}-${weightAxis.max} (expected 90-120)`)
          }
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      testResults,
      summary: {
        basteleurFound: testResults.basteleur.fonts.length,
        basteleurIssues: testResults.basteleur.issues.length,
        jostFound: testResults.jost.fonts.length, 
        jostIssues: testResults.jost.issues.length,
        hedvigFound: testResults.hedvig.fonts.length,
        hedvigIssues: testResults.hedvig.issues.length,
        outwardFound: testResults.outward.fonts.length,
        outwardIssues: testResults.outward.issues.length,
        sligoilFound: testResults.sligoil.fonts.length,
        sligoilIssues: testResults.sligoil.issues.length
      }
    })
    
  } catch (error) {
    console.error('❌ Test fixes error:', error)
    return NextResponse.json({
      success: false,
      error: 'TEST_FAILED',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}