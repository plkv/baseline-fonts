/**
 * Font Processor Pipeline - Standardizes metadata extraction
 * Multi-stage validation pipeline with consistent fallbacks
 */

import opentype from 'opentype.js'

export interface ProcessedFont {
  // Core identification
  family: string
  style: string
  weight: number
  isItalic: boolean
  
  // Technical properties
  isVariable: boolean
  format: string
  fileSize: number
  glyphCount: number
  
  // OpenType data
  openTypeFeatures: string[]
  variableAxes: VariableAxis[]
  
  // Metadata
  languages: string[]
  styleTags: string[]
  category: string[]
  
  // Enhanced data
  version?: string
  copyright?: string
  license?: string
  fontMetrics?: FontMetrics
  designerInfo?: DesignerInfo
  
  // Processing metadata
  processingVersion: string
  processedAt: string
  warnings: string[]
}

interface VariableAxis {
  name: string
  axis: string
  min: number
  max: number
  default: number
}

interface FontMetrics {
  ascender: number
  descender: number
  lineGap: number
  xHeight?: number
  capHeight?: number
  unitsPerEm: number
}

interface DesignerInfo {
  designer?: string
  designerURL?: string
  manufacturer?: string
  vendorURL?: string
  trademark?: string
}

interface ProcessingStage {
  name: string
  process: (font: Partial<ProcessedFont>, buffer: ArrayBuffer) => Promise<Partial<ProcessedFont>>
  required: boolean
}

export class FontProcessor {
  private static readonly PROCESSING_VERSION = '1.0.0'
  
  private stages: ProcessingStage[] = [
    {
      name: 'validateFile',
      process: this.validateFile.bind(this),
      required: true
    },
    {
      name: 'extractBasicMetadata',
      process: this.extractBasicMetadata.bind(this),
      required: true
    },
    {
      name: 'parseOpenTypeFeatures',
      process: this.parseOpenTypeFeatures.bind(this),
      required: false
    },
    {
      name: 'detectLanguageSupport',
      process: this.detectLanguageSupport.bind(this),
      required: false
    },
    {
      name: 'generateStyleTags',
      process: this.generateStyleTags.bind(this),
      required: false
    },
    {
      name: 'extractDesignerInfo',
      process: this.extractDesignerInfo.bind(this),
      required: false
    },
    {
      name: 'validateConsistency',
      process: this.validateConsistency.bind(this),
      required: true
    }
  ]
  
  async processFont(buffer: ArrayBuffer, filename: string): Promise<ProcessedFont> {
    let processedFont: Partial<ProcessedFont> = {
      // Initialize with defaults
      family: filename.replace(/\.[^.]*$/, ''),
      style: 'Regular',
      weight: 400,
      isItalic: false,
      isVariable: false,
      format: this.detectFormat(filename),
      fileSize: buffer.byteLength,
      glyphCount: 0,
      openTypeFeatures: [],
      variableAxes: [],
      languages: ['Latin'],
      styleTags: [],
      category: ['Sans'],
      processingVersion: FontProcessor.PROCESSING_VERSION,
      processedAt: new Date().toISOString(),
      warnings: []
    }
    
    // Run through processing pipeline
    for (const stage of this.stages) {
      try {
        processedFont = await stage.process(processedFont, buffer)
      } catch (error) {
        const warning = `Stage ${stage.name} failed: ${error}`
        processedFont.warnings?.push(warning)
        
        if (stage.required) {
          throw new Error(`Required processing stage failed: ${warning}`)
        }
      }
    }
    
    return processedFont as ProcessedFont
  }
  
  private async validateFile(font: Partial<ProcessedFont>, buffer: ArrayBuffer): Promise<Partial<ProcessedFont>> {
    if (!buffer || buffer.byteLength === 0) {
      throw new Error('Empty or invalid font buffer')
    }
    
    if (buffer.byteLength < 100) {
      throw new Error('Font file too small to be valid')
    }
    
    // Check for font file signatures
    const view = new Uint8Array(buffer.slice(0, 4))
    const signature = Array.from(view).map(b => b.toString(16).padStart(2, '0')).join('')
    
    const validSignatures = [
      '00010000', // TTF
      '4f54544f', // OTF ('OTTO')
      '77656246', // WOFF ('wOFF')
      '774f4632'  // WOFF2 ('wOF2')
    ]
    
    if (!validSignatures.includes(signature)) {
      throw new Error(`Invalid font signature: ${signature}`)
    }
    
    return font
  }
  
  private async extractBasicMetadata(font: Partial<ProcessedFont>, buffer: ArrayBuffer): Promise<Partial<ProcessedFont>> {
    try {
      const otFont = opentype.parse(buffer)
      
      // Extract names
      const names = otFont.names
      const family = names.fontFamily?.en || names.fullName?.en || font.family!
      const style = names.fontSubfamily?.en || 'Regular'
      
      // Extract weight and style
      const weight = this.extractWeight(otFont, style)
      const isItalic = this.detectItalic(otFont, style)
      
      // Extract metrics
      const fontMetrics: FontMetrics = {
        ascender: otFont.ascender,
        descender: otFont.descender,
        lineGap: otFont.lineGap || 0,
        xHeight: otFont.tables.os2?.sxHeight,
        capHeight: otFont.tables.os2?.sCapHeight,
        unitsPerEm: otFont.unitsPerEm
      }
      
      // Variable font detection
      const isVariable = !!otFont.tables.fvar
      const variableAxes = isVariable ? this.extractVariableAxes(otFont) : []
      
      return {
        ...font,
        family,
        style,
        weight,
        isItalic,
        isVariable,
        variableAxes,
        fontMetrics,
        glyphCount: otFont.glyphs.length,
        version: names.version?.en,
        copyright: names.copyright?.en,
        license: names.license?.en
      }
    } catch (error) {
      font.warnings?.push(`OpenType parsing failed: ${error}`)
      return font
    }
  }
  
  private async parseOpenTypeFeatures(font: Partial<ProcessedFont>, buffer: ArrayBuffer): Promise<Partial<ProcessedFont>> {
    try {
      const otFont = opentype.parse(buffer)
      const features: string[] = []
      
      // Extract from GSUB table
      if (otFont.tables.gsub) {
        const gsub = otFont.tables.gsub
        if (gsub.lookupList && gsub.featureList) {
          gsub.featureList.forEach((featureRecord: any) => {
            if (featureRecord.tag && !features.includes(featureRecord.tag)) {
              features.push(featureRecord.tag)
            }
          })
        }
      }
      
      // Extract from GPOS table
      if (otFont.tables.gpos) {
        const gpos = otFont.tables.gpos
        if (gpos.lookupList && gpos.featureList) {
          gpos.featureList.forEach((featureRecord: any) => {
            if (featureRecord.tag && !features.includes(featureRecord.tag)) {
              features.push(featureRecord.tag)
            }
          })
        }
      }
      
      // Convert feature tags to readable names
      const readableFeatures = features.map(tag => this.featureTagToName(tag))
      
      return {
        ...font,
        openTypeFeatures: readableFeatures
      }
    } catch (error) {
      font.warnings?.push(`Feature extraction failed: ${error}`)
      return font
    }
  }
  
  private async detectLanguageSupport(font: Partial<ProcessedFont>, buffer: ArrayBuffer): Promise<Partial<ProcessedFont>> {
    try {
      const otFont = opentype.parse(buffer)
      const languages = new Set(['Latin']) // Default fallback
      
      // Check character coverage for different scripts
      const charMap = new Map<number, number>()
      if (otFont.tables.cmap) {
        // Build character map
        for (let i = 0; i < otFont.glyphs.length; i++) {
          const glyph = otFont.glyphs.glyphs[i]
          if (glyph && glyph.unicode !== undefined) {
            charMap.set(glyph.unicode, i)
          }
        }
        
        // Test for different language support
        if (this.hasCharacterRange(charMap, 0x0400, 0x04FF)) languages.add('Cyrillic')
        if (this.hasCharacterRange(charMap, 0x0370, 0x03FF)) languages.add('Greek')
        if (this.hasCharacterRange(charMap, 0x0590, 0x05FF)) languages.add('Hebrew')
        if (this.hasCharacterRange(charMap, 0x0600, 0x06FF)) languages.add('Arabic')
        if (this.hasCharacterRange(charMap, 0x4E00, 0x9FFF)) languages.add('Chinese')
        if (this.hasCharacterRange(charMap, 0x3040, 0x309F)) languages.add('Japanese')
        if (this.hasCharacterRange(charMap, 0xAC00, 0xD7AF)) languages.add('Korean')
      }
      
      return {
        ...font,
        languages: Array.from(languages)
      }
    } catch (error) {
      font.warnings?.push(`Language detection failed: ${error}`)
      return font
    }
  }
  
  private async generateStyleTags(font: Partial<ProcessedFont>): Promise<Partial<ProcessedFont>> {
    const tags = new Set<string>()
    
    // From OpenType features
    const features = font.openTypeFeatures || []
    if (features.some(f => f.toLowerCase().includes('ligature'))) tags.add('Ligatures')
    if (features.some(f => f.toLowerCase().includes('stylistic'))) tags.add('Stylistic Sets')
    if (features.some(f => f.toLowerCase().includes('swash'))) tags.add('Swashes')
    if (features.some(f => f.toLowerCase().includes('small cap'))) tags.add('Small Caps')
    
    // From family name patterns
    const family = (font.family || '').toLowerCase()
    if (/mono|code|terminal/.test(family)) tags.add('Monospace')
    if (/display|title|headline/.test(family)) tags.add('Display')
    if (/script|handwriting|brush/.test(family)) tags.add('Script')
    if (/serif/.test(family) && !/sans/.test(family)) tags.add('Serif')
    if (/sans/.test(family)) tags.add('Sans Serif')
    if (/slab/.test(family)) tags.add('Slab Serif')
    
    // From variable properties
    if (font.isVariable) tags.add('Variable')
    
    // From weight range
    const axes = font.variableAxes || []
    const weightAxis = axes.find(axis => axis.axis === 'wght')
    if (weightAxis && (weightAxis.max - weightAxis.min) >= 700) {
      tags.add('Wide Weight Range')
    }
    
    return {
      ...font,
      styleTags: Array.from(tags)
    }
  }
  
  private async extractDesignerInfo(font: Partial<ProcessedFont>, buffer: ArrayBuffer): Promise<Partial<ProcessedFont>> {
    try {
      const otFont = opentype.parse(buffer)
      const names = otFont.names
      
      const designerInfo: DesignerInfo = {
        designer: names.designer?.en,
        designerURL: names.designerURL?.en,
        manufacturer: names.manufacturer?.en,
        vendorURL: names.manufacturerURL?.en,
        trademark: names.trademark?.en
      }
      
      return {
        ...font,
        designerInfo
      }
    } catch (error) {
      font.warnings?.push(`Designer info extraction failed: ${error}`)
      return font
    }
  }
  
  private async validateConsistency(font: Partial<ProcessedFont>): Promise<Partial<ProcessedFont>> {
    const warnings = [...(font.warnings || [])]
    
    // Validate required fields
    if (!font.family?.trim()) {
      warnings.push('Missing family name')
    }
    
    if (!font.weight || font.weight < 1 || font.weight > 1000) {
      warnings.push(`Invalid weight: ${font.weight}`)
      font.weight = 400 // Fallback
    }
    
    // Ensure at least one category
    if (!font.category || font.category.length === 0) {
      font.category = ['Sans']
      warnings.push('No categories detected, defaulting to Sans')
    }
    
    // Ensure at least one language
    if (!font.languages || font.languages.length === 0) {
      font.languages = ['Latin']
      warnings.push('No languages detected, defaulting to Latin')
    }
    
    return {
      ...font,
      warnings
    }
  }
  
  // Helper methods
  private detectFormat(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    const formatMap: Record<string, string> = {
      'ttf': 'truetype',
      'otf': 'opentype',
      'woff': 'woff',
      'woff2': 'woff2',
      'eot': 'embedded-opentype'
    }
    return formatMap[ext || 'ttf'] || 'truetype'
  }
  
  private extractWeight(otFont: any, styleName: string): number {
    // Try OS/2 table first
    if (otFont.tables.os2?.usWeightClass) {
      return otFont.tables.os2.usWeightClass
    }
    
    // Fallback to style name parsing
    const styleWeights: Record<string, number> = {
      'thin': 100,
      'extralight': 200,
      'light': 300,
      'regular': 400,
      'medium': 500,
      'semibold': 600,
      'bold': 700,
      'extrabold': 800,
      'black': 900
    }
    
    const lower = styleName.toLowerCase()
    for (const [name, weight] of Object.entries(styleWeights)) {
      if (lower.includes(name)) {
        return weight
      }
    }
    
    return 400
  }
  
  private detectItalic(otFont: any, styleName: string): boolean {
    // Check OS/2 table
    if (otFont.tables.os2?.fsSelection && (otFont.tables.os2.fsSelection & 1)) {
      return true
    }
    
    // Check style name
    return /italic|oblique/i.test(styleName)
  }
  
  private extractVariableAxes(otFont: any): VariableAxis[] {
    if (!otFont.tables.fvar) return []
    
    return otFont.tables.fvar.axes.map((axis: any) => ({
      name: this.axisTagToName(axis.tag),
      axis: axis.tag,
      min: axis.minValue,
      max: axis.maxValue,
      default: axis.defaultValue
    }))
  }
  
  private hasCharacterRange(charMap: Map<number, number>, start: number, end: number): boolean {
    let count = 0
    for (let codePoint = start; codePoint <= end && count < 10; codePoint++) {
      if (charMap.has(codePoint)) count++
    }
    return count >= 3 // At least 3 characters in range
  }
  
  private featureTagToName(tag: string): string {
    const featureNames: Record<string, string> = {
      'liga': 'Standard Ligatures',
      'dlig': 'Discretionary Ligatures',
      'hlig': 'Historical Ligatures',
      'clig': 'Contextual Ligatures',
      'smcp': 'Small Capitals',
      'c2sc': 'Capitals to Small Capitals',
      'swsh': 'Swash',
      'cswh': 'Contextual Swash',
      'salt': 'Stylistic Alternates',
      'ss01': 'Stylistic Set 1',
      'ss02': 'Stylistic Set 2',
      'ss03': 'Stylistic Set 3',
      'ss04': 'Stylistic Set 4',
      'ss05': 'Stylistic Set 5',
      'ss06': 'Stylistic Set 6',
      'ss07': 'Stylistic Set 7',
      'ss08': 'Stylistic Set 8',
      'ss09': 'Stylistic Set 9',
      'ss10': 'Stylistic Set 10',
      'onum': 'Oldstyle Figures',
      'pnum': 'Proportional Figures',
      'tnum': 'Tabular Figures',
      'lnum': 'Lining Figures'
    }
    
    return featureNames[tag] || tag
  }
  
  private axisTagToName(tag: string): string {
    const axisNames: Record<string, string> = {
      'wght': 'Weight',
      'wdth': 'Width',
      'slnt': 'Slant',
      'ital': 'Italic',
      'opsz': 'Optical Size'
    }
    
    return axisNames[tag] || tag
  }
}

// Export singleton instance
export const fontProcessor = new FontProcessor()