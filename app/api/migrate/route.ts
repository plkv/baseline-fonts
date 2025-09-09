/**
 * Data Migration API - Safely migrate from old system to new architecture
 * POST /api/migrate - Run migration process
 */

import { NextRequest, NextResponse } from 'next/server'
import { fontStorage } from '@/lib/font-storage'
import { Font, VariableAxis, FontCategory } from '@/lib/types'

interface OldFont {
  id: string
  filename: string
  family: string
  style: string
  weight: number
  format: string
  fileSize: number
  blobUrl: string
  
  // Admin customizations
  collection: string
  downloadLink?: string
  styleTags: string[]
  
  // Parsed metadata
  languages: string[]
  category: string | string[]
  variableAxes?: any[]
  openTypeFeatures: string[]
  
  // Admin edits
  editableCreationDate?: string
  editableVersion?: string
  editableLicenseType?: string
  
  uploadedAt: string
  [key: string]: any // For other fields we might have missed
}

// Helper functions (same as in migration script)
function normalizeCategories(oldCategory: string | string[]): FontCategory[] {
  const categories = Array.isArray(oldCategory) ? oldCategory : [oldCategory || 'Sans']
  
  const categoryMap: Record<string, FontCategory> = {
    'Sans': 'Sans', 'Sans-based': 'Sans',
    'Serif': 'Serif', 'Serif-based': 'Serif',
    'Slab': 'Slab', 'Mono': 'Mono',
    'Script': 'Script', 'Handwritten': 'Handwritten',
    'Display': 'Display', 'Fatface': 'Display',
    'Decorative': 'Decorative', 'Experimental': 'Experimental',
    'Symbol': 'Symbol', 'Pixel': 'Decorative',
    'Vintage': 'Decorative', 'Stencil': 'Decorative',
  }
  
  return categories.map(cat => categoryMap[cat] || 'Sans')
    .filter((cat, index, arr) => arr.indexOf(cat) === index)
}

function generateTags(font: OldFont): string[] {
  const tags = new Set<string>()
  
  // Preserve existing style tags
  if (font.styleTags && Array.isArray(font.styleTags)) {
    font.styleTags.forEach(tag => tags.add(tag))
  }
  
  // Generate tags from characteristics
  if (font.variableAxes && font.variableAxes.length > 0) {
    tags.add('Variable')
  }
  
  if (font.openTypeFeatures && Array.isArray(font.openTypeFeatures)) {
    if (font.openTypeFeatures.some(f => f.toLowerCase().includes('ligature'))) {
      tags.add('Ligatures')
    }
    if (font.openTypeFeatures.some(f => f.toLowerCase().includes('stylistic'))) {
      tags.add('Stylistic Sets')
    }
  }
  
  if (font.weight <= 250) tags.add('Thin')
  else if (font.weight >= 700) tags.add('Bold')
  
  if (font.style && font.style.toLowerCase().includes('italic')) {
    tags.add('Italic')
  }
  
  return Array.from(tags).sort()
}

function transformVariableAxes(oldAxes?: any[]): VariableAxis[] {
  if (!oldAxes || !Array.isArray(oldAxes)) return []
  
  return oldAxes.map(axis => ({
    name: axis.name || axis.axis || 'Unknown',
    tag: axis.axis || axis.tag || 'unk',
    min: axis.min || 0,
    max: axis.max || 1000,
    default: axis.default || axis.min || 0,
  }))
}

export async function POST(request: NextRequest) {
  try {
    const { action, dryRun = true } = await request.json()
    
    if (action !== 'migrate') {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "migrate".' },
        { status: 400 }
      )
    }
    
    console.log(`🚀 Starting migration (dry run: ${dryRun})...`)
    
    // Fetch current production data from old system
    const oldSystemResponse = await fetch('https://baseline-fonts.vercel.app/api/fonts-clean/list')
    const oldSystemData = await oldSystemResponse.json()
    
    if (!oldSystemData.success || !oldSystemData.fonts) {
      throw new Error('Failed to fetch data from old system')
    }
    
    const oldFonts = oldSystemData.fonts as OldFont[]
    console.log(`📦 Processing ${oldFonts.length} fonts from old system...`)
    
    // Transform to new schema
    const newFonts: Font[] = oldFonts.map((oldFont) => ({
      // Identity - preserve IDs for seamless migration
      id: oldFont.id,
      name: oldFont.family,
      family: oldFont.family,
      
      // File information - preserve all references
      blob: oldFont.blobUrl,
      format: (oldFont.format?.toLowerCase() as any) || 'ttf',
      size: oldFont.fileSize || 0,
      filename: oldFont.filename || 'unknown',
      
      // Typography metadata
      weight: oldFont.weight || 400,
      style: oldFont.style || 'Regular',
      isVariable: Boolean(oldFont.variableAxes && oldFont.variableAxes.length > 0),
      variableAxes: transformVariableAxes(oldFont.variableAxes),
      features: Array.isArray(oldFont.openTypeFeatures) ? oldFont.openTypeFeatures : [],
      languages: Array.isArray(oldFont.languages) ? oldFont.languages : ['Latin'],
      
      // Organization
      collection: (oldFont.collection as any) || 'Text',
      tags: generateTags(oldFont),
      category: normalizeCategories(oldFont.category),
      
      // Admin/Meta
      published: true, // All current fonts are published
      downloadUrl: oldFont.downloadLink && oldFont.downloadLink.trim() ? oldFont.downloadLink : undefined,
      uploadedAt: new Date(oldFont.uploadedAt || Date.now()),
      
      // Extended metadata
      foundry: oldFont.foundry,
      version: oldFont.editableVersion || oldFont.version,
      license: oldFont.editableLicenseType || oldFont.license,
      copyright: oldFont.copyright,
    }))
    
    // Validation
    const summary = {
      totalFonts: newFonts.length,
      collections: {
        Text: newFonts.filter(f => f.collection === 'Text').length,
        Display: newFonts.filter(f => f.collection === 'Display').length,
        Weirdo: newFonts.filter(f => f.collection === 'Weirdo').length,
      },
      variableFonts: newFonts.filter(f => f.isVariable).length,
      withDownloadUrls: newFonts.filter(f => f.downloadUrl).length,
      withTags: newFonts.filter(f => f.tags.length > 0).length,
      missingBlobs: newFonts.filter(f => !f.blob).length,
      invalidCollections: newFonts.filter(f => !['Text', 'Display', 'Weirdo'].includes(f.collection)).length,
    }
    
    if (dryRun) {
      console.log('✅ Dry run completed - no data written')
      return NextResponse.json({
        success: true,
        dryRun: true,
        summary,
        message: 'Migration validated successfully. Set dryRun=false to execute.'
      })
    }
    
    // Actually perform migration
    console.log('💾 Writing migrated data to new system...')
    const result = await fontStorage.bulkImport(newFonts)
    
    console.log(`✅ Migration completed: ${result.success} success, ${result.failed} failed`)
    
    return NextResponse.json({
      success: true,
      dryRun: false,
      summary,
      result,
      message: `Migration completed successfully. ${result.success} fonts migrated, ${result.failed} failed.`
    })
    
  } catch (error) {
    console.error('❌ Migration error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}