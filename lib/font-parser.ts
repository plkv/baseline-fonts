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
}

export async function parseFontFile(buffer: ArrayBuffer, originalName: string, fileSize: number): Promise<FontMetadata> {
  try {
    const font = opentype.parse(buffer)
    
    const name = font.names.fontFamily?.en || font.names.fullName?.en || originalName
    const family = font.names.fontFamily?.en || name
    const style = font.names.fontSubfamily?.en || 'Regular'
    
    // Basic weight detection
    let weight = 400
    const styleStr = style.toLowerCase()
    if (styleStr.includes('thin')) weight = 100
    else if (styleStr.includes('light')) weight = 300
    else if (styleStr.includes('medium')) weight = 500
    else if (styleStr.includes('semi') || styleStr.includes('demi')) weight = 600
    else if (styleStr.includes('bold')) weight = 700
    else if (styleStr.includes('black')) weight = 900

    // Check if variable font (basic detection)
    const isVariable = font.tables?.fvar !== undefined

    const format = originalName.toLowerCase().endsWith('.otf') ? 'otf' : 'ttf'

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
      path: `/fonts/uploads/${originalName}`
    }
  } catch (error) {
    console.error('Font parsing error:', error)
    
    // Fallback metadata
    const family = originalName.replace(/\.[^/.]+$/, "")
    return {
      name: family,
      family,
      style: 'Regular',
      weight: 400,
      isVariable: false,
      format: originalName.toLowerCase().endsWith('.otf') ? 'otf' : 'ttf',
      fileSize,
      uploadedAt: new Date().toISOString(),
      filename: originalName,
      path: `/fonts/uploads/${originalName}`
    }
  }
}