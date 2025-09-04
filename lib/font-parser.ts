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
  // Publishing status
  published?: boolean
  // Download link
  downloadLink?: string
  // Family management
  defaultStyle?: boolean // Is this the default style for the family?
  styleName?: string // Custom style name override
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
    
    // Extract font names and metadata
    console.log('📋 Font names available:', Object.keys(font.names || {}))
    
    const name = font.names.fontFamily?.en || font.names.fullName?.en || originalName
    const family = font.names.fontFamily?.en || name
    const rawStyle = font.names.fontSubfamily?.en || 'Regular'
    const style = rawStyle.trim() || 'Regular' // Fix empty/whitespace styles
    
    // Enhanced foundry detection with whitespace cleanup
    let foundry = 'Unknown'
    if (font.names.manufacturer?.en && font.names.manufacturer.en.trim()) foundry = font.names.manufacturer.en.trim()
    else if (font.names.designer?.en && font.names.designer.en.trim()) foundry = font.names.designer.en.trim()
    else if (font.names.vendorURL?.en && font.names.vendorURL.en.trim()) foundry = font.names.vendorURL.en.trim()
    else if (font.names.designerURL?.en && font.names.designerURL.en.trim()) foundry = font.names.designerURL.en.trim()
    else if (font.names.description?.en && font.names.description.en.trim() && font.names.description.en.trim().length < 100) foundry = font.names.description.en.trim()
    
    console.log(`👤 Foundry detection: "${foundry}"`)
    
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

    // Extract comprehensive OpenType features
    const openTypeFeatures: string[] = []
    const featureList = font.tables?.gsub?.features || []
    const supportedFeatures = new Set<string>()
    
    // Map OpenType feature tags to readable names
    const featureNames: { [key: string]: string } = {
      'kern': 'Kerning',
      'liga': 'Standard Ligatures', 
      'dlig': 'Discretionary Ligatures',
      'clig': 'Contextual Ligatures',
      'hlig': 'Historical Ligatures',
      'smcp': 'Small Capitals',
      'c2sc': 'Small Capitals From Capitals',
      'case': 'Case-Sensitive Forms',
      'cpsp': 'Capital Spacing',
      'swsh': 'Swash',
      'cswh': 'Contextual Swash',
      'salt': 'Stylistic Alternates',
      'ss01': 'Stylistic Set 1',
      'ss02': 'Stylistic Set 2',
      'ss03': 'Stylistic Set 3',
      'ss04': 'Stylistic Set 4',
      'ss05': 'Stylistic Set 5',
      'onum': 'Oldstyle Figures',
      'pnum': 'Proportional Figures',
      'tnum': 'Tabular Figures',
      'lnum': 'Lining Figures',
      'zero': 'Slashed Zero',
      'frac': 'Fractions',
      'sups': 'Superscript',
      'subs': 'Subscript',
      'ordn': 'Ordinals'
    }

    // Extract features from GSUB and GPOS tables
    const extractFeatures = (table: any, tableName: string) => {
      if (!table) {
        console.log(`❌ No ${tableName} table found`)
        return
      }
      
      console.log(`🔍 Scanning ${tableName} table for features...`)
      
      // Modern OpenType.js structure uses 'features' array directly
      if (table.features && Array.isArray(table.features)) {
        console.log(`  Found ${table.features.length} features in ${tableName}`)
        table.features.forEach((feature: any) => {
          const tag = feature.tag || feature.featureTag
          if (tag && featureNames[tag] && !supportedFeatures.has(tag)) {
            supportedFeatures.add(tag)
            openTypeFeatures.push(featureNames[tag])
            console.log(`    ✅ ${tag} -> ${featureNames[tag]}`)
          }
        })
      }
      
      // Legacy OpenType.js structure
      if (table.featureList) {
        // Try different possible structures
        if (table.featureList.featureRecords) {
          table.featureList.featureRecords.forEach((record: any) => {
            const tag = record.featureTag || record.tag
            if (tag && featureNames[tag] && !supportedFeatures.has(tag)) {
              supportedFeatures.add(tag)
              openTypeFeatures.push(featureNames[tag])
              console.log(`    ✅ ${tag} -> ${featureNames[tag]}`)
            }
          })
        }
        
        // Also check direct feature list
        if (Array.isArray(table.featureList)) {
          table.featureList.forEach((feature: any) => {
            if (feature.tag && featureNames[feature.tag] && !supportedFeatures.has(feature.tag)) {
              supportedFeatures.add(feature.tag)
              openTypeFeatures.push(featureNames[feature.tag])
              console.log(`    ✅ ${feature.tag} -> ${featureNames[feature.tag]}`)
            }
          })
        }
      }
      
      if (!table.features && !table.featureList) {
        console.log(`  No features found in ${tableName} table`)
      }
    }

    // Check GSUB table (substitution features like ligatures)
    if (font.tables?.gsub) {
      extractFeatures(font.tables.gsub, 'GSUB')
    }
    
    // Check GPOS table (positioning features like kerning)
    if (font.tables?.gpos) {
      extractFeatures(font.tables.gpos, 'GPOS')
    }

    // Add basic features that most fonts have
    if (font.tables?.kern && !supportedFeatures.has('kern')) {
      openTypeFeatures.push('Kerning')
      supportedFeatures.add('kern')
    }
    
    // Add common ligature support if GSUB table exists
    if (font.tables?.gsub && !supportedFeatures.has('liga')) {
      openTypeFeatures.push('Standard Ligatures')
      supportedFeatures.add('liga')
    }

    // Basic style variations (simplified) with cleanup
    const availableStyles = [style].filter(s => s && s.trim())
    const availableWeights = [weight].filter(w => w && !isNaN(w))

    // Variable font axes (if available)
    const variableAxes = []
    if (isVariable && font.tables?.fvar) {
      try {
        // Common axis tag to name mapping
        const axisNames: { [key: string]: string } = {
          'wght': 'Weight',
          'wdth': 'Width', 
          'slnt': 'Slant',
          'opsz': 'Optical Size',
          'ital': 'Italic',
          'grad': 'Grade',
          'XHGT': 'X Height',
          'XOPQ': 'X Opaque',
          'YOPQ': 'Y Opaque',
          'YTLC': 'Y Transparent LC',
          'YTUC': 'Y Transparent UC',
          'YTAS': 'Y Transparent Ascender',
          'YTDE': 'Y Transparent Descender',
          'YTFI': 'Y Transparent Figure'
        }
        
        for (const axis of font.tables.fvar.axes || []) {
          const tag = String(axis.tag || 'unkn')
          
          // Get axis name - handle various formats
          let axisName = ''
          if (axis.name && typeof axis.name === 'string') {
            axisName = axis.name
          } else if (axis.name && axis.name.en) {
            axisName = axis.name.en
          } else if (axisNames[tag]) {
            axisName = axisNames[tag]
          } else {
            axisName = tag.toUpperCase()
          }
          
          // Set proper defaults based on axis type
          let defaultValue = Number(axis.defaultValue) || 400
          if (tag === 'wght') {
            defaultValue = Number(axis.defaultValue) || 400 // Weight defaults to 400
          } else if (tag === 'wdth') {
            defaultValue = Number(axis.defaultValue) || 100 // Width defaults to 100%
          } else if (tag === 'slnt') {
            defaultValue = Number(axis.defaultValue) || 0 // Slant defaults to 0
          } else if (tag === 'opsz') {
            defaultValue = Number(axis.defaultValue) || 12 // Optical size defaults to 12pt
          }
          
          const safeAxis = {
            name: String(axisName || tag.toUpperCase()),
            axis: tag,
            min: Number(axis.minValue) || 0,
            max: Number(axis.maxValue) || (tag === 'wght' ? 900 : 1000),
            default: defaultValue
          }
          
          // Validate the axis object has no circular references
          JSON.stringify(safeAxis) // This will throw if there are circular refs
          variableAxes.push(safeAxis)
        }
        console.log(`🎛️ Extracted ${variableAxes.length} variable axes:`, variableAxes)
      } catch (axisError) {
        console.error('⚠️ Error processing variable axes:', axisError)
        // Continue without variable axes if there's an error
      }
    }

    // Enhanced language support detection
    const languages: string[] = ['Latin'] // Default
    if (font.tables?.os2) {
      const os2 = font.tables.os2
      // This is simplified - real language detection would need more complex analysis
      if (os2.ulUnicodeRange2 & 0x00000001) languages.push('Cyrillic')
      if (os2.ulUnicodeRange1 & 0x00000080) languages.push('Greek')  
      if (os2.ulUnicodeRange1 & 0x00000100) languages.push('Armenian')
      if (os2.ulUnicodeRange1 & 0x00000200) languages.push('Hebrew')
      if (os2.ulUnicodeRange1 & 0x00000400) languages.push('Arabic')
    }

    console.log(`🎯 Extracted ${openTypeFeatures.length} OpenType features:`, openTypeFeatures)
    console.log(`🌍 Language support:`, languages)

    // Create metadata with safe, serializable values only
    const metadata: FontMetadata = {
      name: String(family || 'Unknown Font'),
      family: String(family || 'Unknown Family'),
      style: String(style || 'Regular'),
      weight: Number(weight) || 400,
      isVariable: Boolean(isVariable),
      format: String(format || 'ttf'),
      fileSize: Number(fileSize) || 0,
      uploadedAt: new Date().toISOString(),
      filename: String(originalName),
      path: `/fonts/uploads/${originalName}`,
      // UI compatibility fields
      styles: 1, // Single uploaded style for now
      features: supportedFeatures.size > 0 ? Array.from(supportedFeatures) : ['liga', 'kern'],
      category: String(category || 'Sans Serif'),
      price: 'Free',
      availableStyles: availableStyles.filter(s => typeof s === 'string'),
      availableWeights: availableWeights.filter(w => typeof w === 'number' && !isNaN(w)),
      variableAxes: variableAxes.length > 0 ? variableAxes : undefined,
      openTypeFeatures: openTypeFeatures.length > 0 ? openTypeFeatures : ['Standard Ligatures', 'Kerning'],
      languages: languages.filter(l => typeof l === 'string'),
      foundry: String(foundry || 'Unknown'),
      published: true, // New fonts are published by default
      defaultStyle: weight === 400 && (style === 'Regular' || style === 'Normal') // 400 weight Regular/Normal is default
    }
    
    // Final safety check - ensure the entire object is serializable
    try {
      JSON.stringify(metadata)
      console.log('✅ Font metadata is safe and serializable')
      return metadata
    } catch (serializationError) {
      console.error('❌ Font metadata contains circular references:', serializationError)
      // Return a minimal safe fallback
      return {
        name: String(family || 'Unknown Font'),
        family: String(family || 'Unknown Family'), 
        style: 'Regular',
        weight: 400,
        isVariable: false,
        format: String(format || 'ttf'),
        fileSize: Number(fileSize) || 0,
        uploadedAt: new Date().toISOString(),
        filename: String(originalName),
        path: `/fonts/uploads/${originalName}`,
        styles: 1,
        features: ['liga', 'kern'],
        category: 'Sans Serif',
        price: 'Free',
        availableStyles: ['Regular'],
        availableWeights: [400],
        openTypeFeatures: ['Standard Ligatures', 'Kerning'],
        languages: ['Latin'],
        foundry: 'Unknown',
        published: true
      }
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