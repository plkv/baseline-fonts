/**
 * Clean Font Storage - Blob + KV Only
 * Simple, reliable font management system
 */

import { kv } from '@vercel/kv'
import { put as blobPut, del as blobDel } from '@vercel/blob'

export interface FontMetadata {
  id: string
  filename: string
  family: string
  style: string
  weight: number
  format: string
  fileSize: number
  uploadedAt: string
  
  // User editable fields
  foundry: string
  downloadLink?: string
  languages: string[]
  collection: 'Text' | 'Display' | 'Weirdo'
  // Additional editable metadata
  editableCreationDate?: string // User can override the extracted creation date
  editableVersion?: string // User can override the extracted version
  editableLicenseType?: string // User can set/override license type
  
  // Font family management
  familyId?: string // Groups fonts of the same family together
  isDefaultStyle?: boolean // Is this the default style for the family?
  italicStyle?: boolean // Is this an italic/oblique variant?
  relatedStyles?: string[] // IDs of other styles in the same family
  
  // Storage info
  blobUrl: string
  
  // Enhanced metadata from OpenType
  category: string
  isVariable: boolean
  availableWeights: number[]
  availableStyles: string[]
  variableAxes?: Array<{
    name: string
    axis: string
    min: number
    max: number
    default: number
  }>
  openTypeFeatures: string[]
  version?: string
  copyright?: string
  license?: string
  glyphCount?: number
  embeddingPermissions?: string
  fontMetrics?: {
    ascender: number
    descender: number
    lineGap: number
    xHeight: number
    capHeight: number
    unitsPerEm: number
  }
  panoseClassification?: string
  creationDate?: string
  modificationDate?: string
  designerInfo?: {
    designer?: string
    designerURL?: string
    manufacturer?: string
    vendorURL?: string
    trademark?: string
  }
  description?: string
  styleTags: string[] // User-customizable style tags
}

class FontStorageClean {
  private static instance: FontStorageClean
  
  static getInstance(): FontStorageClean {
    if (!FontStorageClean.instance) {
      FontStorageClean.instance = new FontStorageClean()
    }
    return FontStorageClean.instance
  }

  /**
   * Upload a font file and store metadata with comprehensive OpenType parsing
   */
  async uploadFont(
    file: File,
    parseFont?: boolean
  ): Promise<FontMetadata> {
    const id = `font_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const uploadedAt = new Date().toISOString()
    
    // Upload file to Blob
    const blob = await blobPut(file.name, file, {
      access: 'public',
      addRandomSuffix: false
    })
    
    let extractedMetadata: Partial<FontMetadata> = {
      family: file.name.split('.')[0],
      style: 'Regular',
      weight: 400,
      foundry: 'Unknown',
      languages: ['Latin'],
      category: 'Sans Serif',
      isVariable: false,
      availableWeights: [400],
      availableStyles: ['Regular'],
      openTypeFeatures: ['Standard Ligatures', 'Kerning']
    }
    
    // Parse font metadata if requested (default: true)
    if (parseFont !== false) {
      try {
        const { parseFontFile } = await import('./font-parser')
        const buffer = await file.arrayBuffer()
        const parsedData = await parseFontFile(buffer, file.name, file.size)
        
        // Extract relevant fields from parsed data
        extractedMetadata = {
          family: parsedData.family,
          style: parsedData.style,
          weight: parsedData.weight,
          foundry: parsedData.foundry || 'Unknown',
          languages: parsedData.languages || ['Latin'],
          category: parsedData.category || 'Sans Serif',
          isVariable: parsedData.isVariable || false,
          availableWeights: parsedData.availableWeights || [parsedData.weight || 400],
          availableStyles: parsedData.availableStyles || [parsedData.style || 'Regular'],
          variableAxes: parsedData.variableAxes,
          openTypeFeatures: parsedData.openTypeFeatures || ['Standard Ligatures', 'Kerning'],
          // Comprehensive metadata extraction
          version: parsedData.version,
          copyright: parsedData.copyright,
          license: parsedData.license,
          glyphCount: parsedData.glyphCount,
          embeddingPermissions: parsedData.embeddingPermissions,
          fontMetrics: parsedData.fontMetrics,
          panoseClassification: parsedData.panoseClassification,
          creationDate: parsedData.creationDate,
          modificationDate: parsedData.modificationDate,
          designerInfo: parsedData.designerInfo,
          description: parsedData.description,
          collection: parsedData.collection || 'Text',
          familyId: parsedData.familyId,
          isDefaultStyle: parsedData.isDefaultStyle,
          italicStyle: parsedData.italicStyle,
          styleTags: parsedData.styleTags || [],
        }
        
        console.log('✅ Font parsed successfully:', extractedMetadata.family)
      } catch (parseError) {
        console.warn('⚠️ Font parsing failed, using filename fallback:', parseError)
        // Keep default fallback metadata
      }
    }
    
    // Create full metadata
    const fullMetadata: FontMetadata = {
      id,
      filename: file.name,
      fileSize: file.size,
      format: file.name.split('.').pop()?.toLowerCase() || 'unknown',
      uploadedAt,
      blobUrl: blob.url,
      downloadLink: undefined,
      ...extractedMetadata
    }
    
    // Store metadata in KV
    await kv.set(id, fullMetadata)
    
    // Add to index
    await this.addToIndex(id)
    
    return fullMetadata
  }

  /**
   * Get all fonts
   */
  async getAllFonts(): Promise<FontMetadata[]> {
    const keys = await this.getAllFontKeys()
    const fonts: FontMetadata[] = []
    
    for (const key of keys) {
      const metadata = await kv.get<FontMetadata>(key)
      if (metadata) {
        fonts.push(metadata)
      }
    }
    
    return fonts.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
  }

  /**
   * Get font by ID
   */
  async getFontById(id: string): Promise<FontMetadata | null> {
    return await kv.get<FontMetadata>(id)
  }

  /**
   * Update font metadata - now supports all editable fields
   */
  async updateFont(id: string, updates: Partial<Pick<FontMetadata, 
    'family' | 'foundry' | 'downloadLink' | 'languages' | 'category' | 'weight' | 'styleTags' | 'collection' |
    'editableCreationDate' | 'editableVersion' | 'editableLicenseType' | 'isDefaultStyle' | 'familyId' |
    'version' | 'copyright' | 'license' | 'creationDate' | 'modificationDate' | 'description'
  >>): Promise<boolean> {
    const existing = await this.getFontById(id)
    if (!existing) return false
    
    const updated = { ...existing, ...updates }
    await kv.set(id, updated)
    return true
  }

  /**
   * Delete font (both file and metadata)
   */
  async deleteFont(id: string): Promise<boolean> {
    const font = await this.getFontById(id)
    if (!font) return false
    
    // Delete from Blob
    await blobDel(font.blobUrl)
    
    // Delete from KV
    await kv.del(id)
    
    // Remove from index
    await this.removeFromIndex(id)
    
    return true
  }

  /**
   * Get all font keys from KV
   */
  private async getAllFontKeys(): Promise<string[]> {
    // In production, this would use KV scan operations
    // For now, we'll implement a simple approach
    const allKeys: string[] = []
    
    try {
      // KV doesn't have a direct "get all keys" method
      // We'll need to maintain an index or use a different approach
      
      // For this clean implementation, let's use a font index
      const fontIndex = await kv.get<string[]>('font_index') || []
      return fontIndex
    } catch {
      return []
    }
  }

  /**
   * Add font ID to index
   */
  private async addToIndex(id: string): Promise<void> {
    const index = await kv.get<string[]>('font_index') || []
    if (!index.includes(id)) {
      index.push(id)
      await kv.set('font_index', index)
    }
  }

  /**
   * Remove font ID from index
   */
  private async removeFromIndex(id: string): Promise<void> {
    const index = await kv.get<string[]>('font_index') || []
    const newIndex = index.filter(fontId => fontId !== id)
    await kv.set('font_index', newIndex)
  }
  
  /**
   * Add style to existing font family
   */
  async addStyleToFamily(familyName: string, file: File): Promise<FontMetadata> {
    // Find existing fonts in this family
    const existingFonts = await this.getFontsByFamily(familyName)
    
    if (existingFonts.length === 0) {
      throw new Error(`No existing family found with name: ${familyName}`)
    }
    
    // Upload the new style with automatic parsing, but force family name override
    const newFont = await this.uploadFont(file, true)
    
    // Generate or use existing family ID
    const familyId = existingFonts[0].familyId || `family_${familyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`
    
    // CRITICAL FIX: Force the family name to match the target family
    // This prevents creating duplicate families when font metadata has different family names
    const relatedStyleIds = existingFonts.map(f => f.id)
    
    // Update the new font directly in KV with forced family information
    await kv.set(newFont.id, {
      ...newFont,
      family: familyName, // FORCE the family name to match existing family
      familyId,
      isDefaultStyle: false,
      relatedStyles: relatedStyleIds
    })
    
    // Update all existing fonts in the family to include this new style
    for (const existingFont of existingFonts) {
      const updatedRelatedStyles = [...(existingFont.relatedStyles || []), newFont.id]
      await kv.set(existingFont.id, {
        ...existingFont,
        familyId,
        relatedStyles: updatedRelatedStyles
      })
    }
    
    // Return the updated font with correct family name
    const updatedNewFont = await this.getFontById(newFont.id)
    return updatedNewFont || newFont
  }
  
  /**
   * Get fonts by family name
   */
  async getFontsByFamily(familyName: string): Promise<FontMetadata[]> {
    const allFonts = await this.getAllFonts()
    return allFonts.filter(font => font.family === familyName)
  }
  
  /**
   * Set default style for a family
   */
  async setDefaultStyle(familyName: string, styleId: string): Promise<boolean> {
    const familyFonts = await this.getFontsByFamily(familyName)
    
    // Remove default from all fonts in family
    for (const font of familyFonts) {
      await kv.set(font.id, {
        ...font,
        isDefaultStyle: font.id === styleId
      })
    }
    
    return true
  }
  
  /**
   * Delete individual style from family
   */
  async deleteStyleFromFamily(styleId: string): Promise<boolean> {
    const font = await this.getFontById(styleId)
    if (!font) return false
    
    const familyName = font.family
    const familyFonts = await this.getFontsByFamily(familyName)
    
    // Don't allow deletion if this is the only style in the family
    if (familyFonts.length <= 1) {
      throw new Error('Cannot delete the last style in a family. Delete the entire family instead.')
    }
    
    // If this was the default style, set another style as default
    if (font.isDefaultStyle && familyFonts.length > 1) {
      const otherFont = familyFonts.find(f => f.id !== styleId)
      if (otherFont) {
        await this.setDefaultStyle(familyName, otherFont.id)
      }
    }
    
    // Remove this style from related styles of other fonts in the family
    for (const relatedFont of familyFonts) {
      if (relatedFont.id !== styleId && relatedFont.relatedStyles?.includes(styleId)) {
        const updatedRelatedStyles = relatedFont.relatedStyles.filter(id => id !== styleId)
        await kv.set(relatedFont.id, {
          ...relatedFont,
          relatedStyles: updatedRelatedStyles
        })
      }
    }
    
    // Delete the style (file and metadata)
    return await this.deleteFont(styleId)
  }
  
  /**
   * Get all unique font families
   */
  async getAllFamilies(): Promise<string[]> {
    const allFonts = await this.getAllFonts()
    const families = new Set<string>()
    allFonts.forEach(font => families.add(font.family))
    return Array.from(families).sort()
  }
}

export const fontStorageClean = FontStorageClean.getInstance()