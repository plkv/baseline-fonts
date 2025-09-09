/**
 * Data Migration Script - Transform old schema to new clean architecture
 */

import { Font, VariableAxis, FontCategory } from '../lib/types'
import { exportProductionData, ProductionFont } from './data-export'

// Helper function to normalize categories
function normalizeCategories(oldCategory: string | string[]): FontCategory[] {
  const categories = Array.isArray(oldCategory) ? oldCategory : [oldCategory || 'Sans']
  
  return categories.map(cat => {
    // Map old category names to new simplified taxonomy
    const categoryMap: Record<string, FontCategory> = {
      'Sans': 'Sans',
      'Sans-based': 'Sans',
      'Serif': 'Serif', 
      'Serif-based': 'Serif',
      'Slab': 'Slab',
      'Mono': 'Mono',
      'Script': 'Script',
      'Handwritten': 'Handwritten',
      'Display': 'Display',
      'Fatface': 'Display',
      'Decorative': 'Decorative',
      'Experimental': 'Experimental',
      'Symbol': 'Symbol',
      'Pixel': 'Decorative',
      'Vintage': 'Decorative',
      'Stencil': 'Decorative',
    }
    
    return categoryMap[cat] || 'Sans' // Default fallback
  }).filter((cat, index, arr) => arr.indexOf(cat) === index) // Remove duplicates
}

// Helper function to generate meaningful tags from metadata
function generateTags(font: ProductionFont): string[] {
  const tags = new Set<string>()
  
  // Preserve existing style tags
  if (font.styleTags && Array.isArray(font.styleTags)) {
    font.styleTags.forEach(tag => tags.add(tag))
  }
  
  // Generate tags from font characteristics
  if (font.variableAxes && font.variableAxes.length > 0) {
    tags.add('Variable')
  }
  
  // OpenType feature tags
  if (font.openTypeFeatures && Array.isArray(font.openTypeFeatures)) {
    if (font.openTypeFeatures.some(f => f.toLowerCase().includes('ligature'))) {
      tags.add('Ligatures')
    }
    if (font.openTypeFeatures.some(f => f.toLowerCase().includes('stylistic'))) {
      tags.add('Stylistic Sets')
    }
    if (font.openTypeFeatures.some(f => f.toLowerCase().includes('small cap'))) {
      tags.add('Small Caps')
    }
  }
  
  // Weight-based tags
  if (font.weight <= 250) tags.add('Thin')
  else if (font.weight >= 700) tags.add('Bold')
  
  // Style-based tags  
  if (font.style && font.style.toLowerCase().includes('italic')) {
    tags.add('Italic')
  }
  
  // Language tags (for major scripts)
  if (font.languages && Array.isArray(font.languages)) {
    if (font.languages.includes('Cyrillic')) tags.add('Cyrillic')
    if (font.languages.includes('Greek')) tags.add('Greek') 
    if (font.languages.includes('Arabic')) tags.add('Arabic')
    if (font.languages.includes('Hebrew')) tags.add('Hebrew')
    if (font.languages.some(l => ['Chinese', 'Japanese', 'Korean'].includes(l))) {
      tags.add('CJK')
    }
  }
  
  return Array.from(tags).sort()
}

// Transform variable axes to new format
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

// Main migration function
export async function migrateData(): Promise<Font[]> {
  console.log('🚀 Starting data migration...')
  
  // Export current production data
  const exportData = await exportProductionData()
  const oldFonts = exportData.fonts
  
  console.log(`\n📦 Migrating ${oldFonts.length} fonts...`)
  
  const migratedFonts: Font[] = oldFonts.map((oldFont, index) => {
    if (index % 50 === 0) {
      console.log(`  Processing font ${index + 1}/${oldFonts.length}...`)
    }
    
    const newFont: Font = {
      // Identity - preserve original IDs for seamless migration
      id: oldFont.id,
      name: oldFont.family, // Use family as display name
      family: oldFont.family,
      
      // File information - preserve all file references
      blob: oldFont.blobUrl,
      format: (oldFont.format?.toLowerCase() as any) || 'ttf',
      size: oldFont.fileSize || 0,
      filename: oldFont.filename || 'unknown',
      
      // Typography metadata - clean up and normalize
      weight: oldFont.weight || 400,
      style: oldFont.style || 'Regular',
      isVariable: Boolean(oldFont.variableAxes && oldFont.variableAxes.length > 0),
      variableAxes: transformVariableAxes(oldFont.variableAxes),
      features: Array.isArray(oldFont.openTypeFeatures) ? oldFont.openTypeFeatures : [],
      languages: Array.isArray(oldFont.languages) ? oldFont.languages : ['Latin'],
      
      // Organization - normalize and clean
      collection: (oldFont.collection as any) || 'Text',
      tags: generateTags(oldFont),
      category: normalizeCategories(oldFont.category),
      
      // Admin/Meta - preserve important customizations
      published: true, // All current fonts are published
      downloadUrl: oldFont.downloadLink && oldFont.downloadLink.trim() ? oldFont.downloadLink : undefined,
      uploadedAt: new Date(oldFont.uploadedAt || Date.now()),
      
      // Optional extended metadata - preserve when available
      foundry: oldFont.foundry,
      version: oldFont.editableVersion || oldFont.version,
      license: oldFont.editableLicenseType || oldFont.license,
      copyright: oldFont.copyright,
    }
    
    return newFont
  })
  
  // Validation
  console.log('\n✅ Migration completed!')
  console.log(`Migrated: ${migratedFonts.length} fonts`)
  console.log(`Collections: ${migratedFonts.filter(f => f.collection === 'Text').length} Text, ${migratedFonts.filter(f => f.collection === 'Display').length} Display, ${migratedFonts.filter(f => f.collection === 'Weirdo').length} Weirdo`)
  console.log(`Variable fonts: ${migratedFonts.filter(f => f.isVariable).length}`)
  console.log(`With download URLs: ${migratedFonts.filter(f => f.downloadUrl).length}`)
  console.log(`With custom tags: ${migratedFonts.filter(f => f.tags.length > 0).length}`)
  
  // Data integrity checks
  const missingBlobs = migratedFonts.filter(f => !f.blob)
  const invalidCollections = migratedFonts.filter(f => !['Text', 'Display', 'Weirdo'].includes(f.collection))
  
  if (missingBlobs.length > 0) {
    console.warn(`⚠️  ${missingBlobs.length} fonts missing blob URLs`)
  }
  if (invalidCollections.length > 0) {
    console.warn(`⚠️  ${invalidCollections.length} fonts with invalid collections`)
  }
  
  return migratedFonts
}

// Save migrated data to file for review
export async function saveMigrationData() {
  const migratedFonts = await migrateData()
  
  const migrationResult = {
    migratedAt: new Date().toISOString(),
    totalFonts: migratedFonts.length,
    fonts: migratedFonts,
    summary: {
      collections: {
        Text: migratedFonts.filter(f => f.collection === 'Text').length,
        Display: migratedFonts.filter(f => f.collection === 'Display').length,
        Weirdo: migratedFonts.filter(f => f.collection === 'Weirdo').length,
      },
      variableFonts: migratedFonts.filter(f => f.isVariable).length,
      customDownloads: migratedFonts.filter(f => f.downloadUrl).length,
      taggedFonts: migratedFonts.filter(f => f.tags.length > 0).length,
    }
  }
  
  // Save to local file for review
  const fs = require('fs')
  const path = require('path')
  
  const outputPath = path.join(__dirname, '../.migration-data.json')
  fs.writeFileSync(outputPath, JSON.stringify(migrationResult, null, 2))
  
  console.log(`\n💾 Migration data saved to: ${outputPath}`)
  console.log('Review the file before deploying the new architecture')
  
  return migrationResult
}

// Run if called directly
if (require.main === module) {
  saveMigrationData().catch(console.error)
}