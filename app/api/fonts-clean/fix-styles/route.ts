import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Fixing font style names...')
    
    // Get all fonts and group by family
    const allFonts = await fontStorageClean.getAllFonts()
    const fontsByFamily = new Map<string, any[]>()
    
    allFonts.forEach(font => {
      const familyName = font.family
      if (!fontsByFamily.has(familyName)) {
        fontsByFamily.set(familyName, [])
      }
      fontsByFamily.get(familyName)!.push(font)
    })
    
    const results: any[] = []
    
    for (const [familyName, familyFonts] of fontsByFamily.entries()) {
      // Skip single-font families
      if (familyFonts.length === 1) continue
      
      console.log(`🔧 Processing family: ${familyName} (${familyFonts.length} fonts)`)
      
      // Find common prefix (true family name)
      const filenames = familyFonts.map(f => f.filename.replace(/\.(ttf|otf|woff2?)$/i, ''))
      const trueFamilyName = findCommonPrefix(filenames)
      
      const updates: any[] = []
      
      // Fix each font's style name
      for (const font of familyFonts) {
        const correctedStyle = determineCorrectStyle(font, trueFamilyName)
        
        if (correctedStyle !== font.style) {
          console.log(`  📝 ${font.filename}: "${font.style}" → "${correctedStyle}"`)
          
          const success = await fontStorageClean.updateFont(font.id, {
            style: correctedStyle
          })
          
          updates.push({
            id: font.id,
            filename: font.filename,
            oldStyle: font.style,
            newStyle: correctedStyle,
            success
          })
        }
      }
      
      if (updates.length > 0) {
        results.push({
          family: familyName,
          trueFamilyName,
          updates
        })
      }
    }
    
    console.log(`✅ Style name fixes complete. Fixed ${results.reduce((sum, r) => sum + r.updates.length, 0)} fonts across ${results.length} families.`)
    
    return NextResponse.json({
      success: true,
      message: `Fixed style names for ${results.reduce((sum, r) => sum + r.updates.length, 0)} fonts`,
      families: results
    })
    
  } catch (error) {
    console.error('❌ Style name fix error:', error)
    return NextResponse.json({
      success: false,
      error: 'STYLE_FIX_FAILED',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper functions (copied from font-storage-clean.ts)
function findCommonPrefix(names: string[]): string {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0].replace(/\s+(Regular|Light|Bold|Medium|Thin|Black)$/i, '').trim()

  let prefix = names[0]
  for (let i = 1; i < names.length; i++) {
    while (names[i].indexOf(prefix) !== 0) {
      prefix = prefix.substring(0, prefix.length - 1)
      if (prefix === '') return names[0].split(/[-\s]/)[0]
    }
  }
  
  // Clean up the prefix by removing style keywords
  return prefix.replace(/[-\s]+(Regular|Light|Bold|Medium|Thin|Black)$/i, '').trim()
}

function determineCorrectStyle(font: any, trueFamilyName: string): string {
  // Extract style from filename by removing family name
  const filename = font.filename.replace(/\.(ttf|otf|woff2?)$/i, '')
  let styleFromFilename = filename.replace(trueFamilyName, '').replace(/^[-\s]+/, '').trim()
  
  // If no style in filename, determine from weight
  if (!styleFromFilename) {
    styleFromFilename = weightToStyleName(font.weight, font.italicStyle || false)
  }

  // Clean up and normalize style name
  if (styleFromFilename) {
    return styleFromFilename
  }

  // Fallback: determine style from weight
  return weightToStyleName(font.weight, font.italicStyle || false)
}

function weightToStyleName(weight: number, isItalic: boolean): string {
  let styleName = 'Regular'
  
  if (weight <= 150) styleName = 'Thin'
  else if (weight <= 250) styleName = 'ExtraLight'  
  else if (weight <= 350) styleName = 'Light'
  else if (weight <= 450) styleName = 'Regular'
  else if (weight <= 550) styleName = 'Medium'
  else if (weight <= 650) styleName = 'SemiBold'
  else if (weight <= 750) styleName = 'Bold'
  else if (weight <= 850) styleName = 'ExtraBold'
  else styleName = 'Black'
  
  return isItalic ? `${styleName} Italic` : styleName
}