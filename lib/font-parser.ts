import opentype from 'opentype.js'

export interface FontMetadata {
  name: string
  family: string
  style: string
  weight: number
  isVariable: boolean
  format: string
  fileSize: number
  uploadedAt: string
  filename: string
  path: string
  url?: string
  // Additional fields for UI compatibility
  styles: number
  features: string[]
  category: string
  price: string
  availableStyles: string[]
  availableWeights: number[]
  variableAxes?: Array<{
    name: string
    axis: string
    min: number
    max: number
    default: number
  }>
  openTypeFeatures: string[]
  languages: string[]
  foundry?: string
}

export async function parseFontFile(buffer: ArrayBuffer, originalName: string, fileSize: number): Promise<FontMetadata> {
  console.log(`🔍 Parsing font: ${originalName} (${fileSize} bytes)`)
  
  try {
    // Validate buffer
    if (!buffer || buffer.byteLength === 0) {
      throw new Error('Empty or invalid font buffer')
    }
    
    if (buffer.byteLength < 100) {
      throw new Error('Font file too small to be valid')
    }
    
    console.log(`📦 Font buffer size: ${buffer.byteLength} bytes`)
    
    const font = opentype.parse(buffer)
    
    if (!font) {
      throw new Error('OpenType.js failed to parse font')
    }
    
    console.log(`✅ OpenType.js successfully parsed font: ${font.names?.fontFamily?.en || 'Unknown'}`)
    
    const name = font.names.fontFamily?.en || font.names.fullName?.en || originalName
    const family = font.names.fontFamily?.en || name
    const style = font.names.fontSubfamily?.en || 'Regular'
    const foundry = font.names.manufacturer?.en || font.names.designer?.en || 'Unknown'
    
    // Enhanced weight detection - check both style and family name
    let weight = 400
    const styleStr = style.toLowerCase()
    const familyStr = family.toLowerCase()
    const combinedStr = `${styleStr} ${familyStr}`
    
    if (combinedStr.includes('thin') || combinedStr.includes('ultralight')) weight = 100
    else if (combinedStr.includes('extralight') || combinedStr.includes('light')) weight = 300  
    else if (combinedStr.includes('medium')) weight = 500
    else if (combinedStr.includes('semibold') || combinedStr.includes('semi') || combinedStr.includes('demi')) weight = 600
    else if (combinedStr.includes('extrabold') || combinedStr.includes('bold')) weight = 700
    else if (combinedStr.includes('black') || combinedStr.includes('heavy')) weight = 900
    
    // Check if variable font (basic detection)
    const isVariable = font.tables?.fvar !== undefined

    const format = originalName.toLowerCase().endsWith('.otf') ? 'otf' : 'ttf'

    // Enhanced category detection
    const familyLower = family.toLowerCase()
    let category = 'Sans Serif' // Default
    
    if (familyLower.includes('mono') || familyLower.includes('code') || familyLower.includes('console')) {
      category = 'Monospace'
    } else if (familyLower.includes('serif') && !familyLower.includes('sans')) {
      category = 'Serif'
    } else if (familyLower.includes('display') || familyLower.includes('decorative')) {
      category = 'Display'
    } else if (familyLower.includes('script') || familyLower.includes('handwriting')) {
      category = 'Script'
    } else if (familyLower.includes('pixel') || familyLower.includes('bitmap')) {
      category = 'Pixel'
    }
    
    console.log(`⚖️ Font: "${family}" -> Weight: ${weight}, Category: ${category}`)

    // Basic style variations (simplified)
    const availableStyles = [style]
    const availableWeights = [weight]

    // Variable font axes (if available)
    const variableAxes = []
    if (isVariable && font.tables?.fvar) {
      for (const axis of font.tables.fvar.axes || []) {
        variableAxes.push({
          name: axis.name || axis.tag,
          axis: axis.tag,
          min: axis.minValue,
          max: axis.maxValue,
          default: axis.defaultValue
        })
      }
    }

    return {
      name: family,
      family,
      style,
      weight,
      isVariable,
      format,
      fileSize,
      uploadedAt: new Date().toISOString(),
      filename: originalName,
      path: `/fonts/uploads/${originalName}`,
      // UI compatibility fields
      styles: 1, // Single uploaded style for now
      features: ['liga', 'kern'], // Basic features
      category,
      price: 'Free',
      availableStyles,
      availableWeights,
      variableAxes: variableAxes.length > 0 ? variableAxes : undefined,
      openTypeFeatures: ['Standard Ligatures', 'Kerning'], // Basic features
      languages: ['Latin'], // Basic language support
      foundry
    }
  } catch (error) {
    console.error('❌ Font parsing error:', error)
    console.error('📁 File details:', { 
      name: originalName, 
      size: fileSize,
      bufferSize: buffer?.byteLength || 0
    })
    
    // Check if it's a valid font file extension
    const validExtensions = ['.ttf', '.otf', '.woff', '.woff2']
    const hasValidExtension = validExtensions.some(ext => 
      originalName.toLowerCase().endsWith(ext)
    )
    
    if (!hasValidExtension) {
      throw new Error(`Invalid font file format. Supported formats: ${validExtensions.join(', ')}`)
    }
    
    // If OpenType.js fails but it's a valid extension, provide detailed error
    const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error'
    throw new Error(`Font parsing failed: ${errorMessage}. The file might be corrupted or use an unsupported font format variant.`)
  }
}