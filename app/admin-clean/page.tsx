"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, Trash2, ChevronDown, ChevronRight, Edit3, Save, X } from "lucide-react"
import { toast } from "sonner"
import { Toaster } from "sonner"

interface Font {
  id: string
  filename: string
  family: string
  style: string
  weight: number
  format: string
  fileSize: number
  uploadedAt: string
  foundry: string
  downloadLink?: string
  languages: string[]
  blobUrl: string
  category: string
  weight: number
  styleTags: string[]
  collection: 'Text' | 'Display' | 'Weirdo'
  // Additional editable metadata
  editableCreationDate?: string
  editableVersion?: string
  editableLicenseType?: string
  // Font family management
  familyId?: string
  isDefaultStyle?: boolean
  italicStyle?: boolean
  relatedStyles?: string[]
  // Extended metadata
  version?: string
  copyright?: string
  license?: string
  glyphCount?: number
  embeddingPermissions?: string
  description?: string
  isVariable?: boolean
  variableAxes?: Array<{
    name: string
    axis: string
    min: number
    max: number
    default: number
  }>
}

const LANGUAGE_OPTIONS = [
  'Latin', 'Cyrillic', 'Greek', 'Arabic', 'Hebrew', 'Chinese', 'Japanese',
  'Korean', 'Thai', 'Vietnamese', 'Hindi', 'Bengali', 'Tamil', 'Telugu'
]

// Collection-specific categories
const CATEGORY_OPTIONS = {
  Text: ['Sans', 'Serif', 'Slab', 'Mono'],
  Display: ['Sans-based', 'Serif-based', 'Fatface', 'Script', 'Handwritten', 'Pixel', 'Vintage', 'Stencil'],
  Weirdo: ['Experimental', 'Symbol', 'Bitmap', 'Decorative', 'Artistic', 'Conceptual']
} as const

const COLLECTION_OPTIONS = [
  { value: 'Text', label: 'Text', description: 'Fonts optimized for body text and reading' },
  { value: 'Display', label: 'Display', description: 'Fonts for headlines, titles, and decorative use' },
  { value: 'Weirdo', label: 'Weirdo', description: 'Experimental, artistic, and unconventional fonts' }
] as const

const LICENSE_TYPE_OPTIONS = [
  'Open Source', 'SIL Open Font License', 'Apache License', 'MIT License', 
  'GNU GPL', 'Creative Commons', 'Commercial', 'Proprietary', 'Freeware', 
  'Shareware', 'Custom License', 'Unknown'
]

const WEIGHT_OPTIONS = [
  { value: 100, label: '100 - Thin' },
  { value: 200, label: '200 - ExtraLight' },
  { value: 300, label: '300 - Light' },
  { value: 400, label: '400 - Regular' },
  { value: 500, label: '500 - Medium' },
  { value: 600, label: '600 - SemiBold' },
  { value: 700, label: '700 - Bold' },
  { value: 800, label: '800 - ExtraBold' },
  { value: 900, label: '900 - Black' }
]

export default function CleanAdmin() {
  const [fonts, setFonts] = useState<Font[]>([])
  const [families, setFamilies] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [merging, setMerging] = useState(false)
  const [selectedFamilies, setSelectedFamilies] = useState<Set<string>>(new Set())
  const [targetFamilyName, setTargetFamilyName] = useState('')
  const [loading, setLoading] = useState(true)
  const [addingStyle, setAddingStyle] = useState(false)
  const [addingStyleFor, setAddingStyleFor] = useState<string>('')
  const [sortBy, setSortBy] = useState<'new' | 'a-z'>('new')
  const [filterCollection, setFilterCollection] = useState<'all' | 'Text' | 'Display' | 'Weirdo'>('all')
  const [expandedFonts, setExpandedFonts] = useState<Set<string>>(new Set())
  const [editingFont, setEditingFont] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    family: '',
    foundry: '',
    downloadLink: '',
    languages: [] as string[],
    category: '',
    weight: 400,
    styleTags: [] as string[],
    collection: 'Text' as 'Text' | 'Display' | 'Weirdo',
    editableCreationDate: '',
    editableVersion: '',
    editableLicenseType: ''
  })
  const [newStyleTag, setNewStyleTag] = useState('')

  // Load fonts and families
  const loadFonts = async () => {
    try {
      const [fontsResponse, familiesResponse] = await Promise.all([
        fetch('/api/fonts-clean/list'),
        fetch('/api/fonts-clean/families')
      ])
      
      if (fontsResponse.ok) {
        const data = await fontsResponse.json()
        setFonts(data.fonts || [])
      }
      
      if (familiesResponse.ok) {
        const data = await familiesResponse.json()
        setFamilies(data.families || [])
      }
    } catch (error) {
      console.error('Failed to load fonts:', error)
      toast.error('Failed to load fonts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFonts()
  }, [])

  // Toggle family selection for merging
  const toggleFamilySelection = (familyName: string) => {
    setSelectedFamilies(prev => {
      const newSet = new Set(prev)
      if (newSet.has(familyName)) {
        newSet.delete(familyName)
      } else {
        newSet.add(familyName)
      }
      return newSet
    })
  }

  // Merge selected families into target name
  const mergeSelectedFamilies = async () => {
    if (selectedFamilies.size < 2) {
      toast.error('Select at least 2 families to merge')
      return
    }
    
    if (!targetFamilyName.trim()) {
      toast.error('Enter a target family name')
      return
    }

    setMerging(true)
    try {
      // Get all fonts from selected families
      const fontsToUpdate = fonts.filter(font => selectedFamilies.has(font.family))
      
      console.log('Merging families:', Array.from(selectedFamilies), 'into:', targetFamilyName)
      console.log('Fonts to update:', fontsToUpdate.map(f => f.filename))
      
      // Update each font to use the target family name
      let updatedCount = 0
      for (const font of fontsToUpdate) {
        try {
          const response = await fetch('/api/fonts-clean/update', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fontId: font.id,
              updates: {
                family: targetFamilyName
              }
            })
          })

          if (response.ok) {
            updatedCount++
          } else {
            console.error('Failed to update font:', font.filename)
          }
        } catch (error) {
          console.error('Error updating font:', font.filename, error)
        }
      }
      
      toast.success(`Successfully merged ${updatedCount} fonts into "${targetFamilyName}"`)
      setSelectedFamilies(new Set())
      setTargetFamilyName('')
      loadFonts() // Reload the fonts
      
    } catch (error) {
      console.error('Merge error:', error)
      toast.error('Failed to merge families')
    } finally {
      setMerging(false)
    }
  }

  // Upload font
  const handleUpload = async (files: FileList) => {
    if (files.length === 0) return

    setUploading(true)
    
    for (const file of files) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('family', file.name.split('.')[0])

        const response = await fetch('/api/fonts-clean/upload', {
          method: 'POST',
          body: formData
        })

        if (response.ok) {
          toast.success(`${file.name} uploaded successfully`)
        } else {
          const error = await response.json()
          toast.error(`Upload failed: ${error.error}`)
        }
      } catch (error) {
        console.error('Upload error:', error)
        toast.error(`Upload failed for ${file.name}`)
      }
    }

    setUploading(false)
    loadFonts() // Reload fonts and families
  }
  
  // Set default style for family
  const setDefaultStyle = async (familyName: string, styleId: string) => {
    try {
      const response = await fetch('/api/fonts-clean/set-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyName, styleId })
      })

      if (response.ok) {
        toast.success(`Default style set for ${familyName}`)
        loadFonts() // Reload to update default style indicators
      } else {
        toast.error('Failed to set default style')
      }
    } catch (error) {
      console.error('Set default error:', error)
      toast.error('Failed to set default style')
    }
  }
  
  // Quick add style - opens file browser directly
  const quickAddStyle = (familyName: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.ttf,.otf,.woff,.woff2'
    input.multiple = true
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files && files.length > 0) {
        setAddingStyle(true)
        setAddingStyleFor(familyName)
        
        for (const file of Array.from(files)) {
          try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('familyName', familyName)

            const response = await fetch('/api/fonts-clean/add-style', {
              method: 'POST',
              body: formData
            })

            if (response.ok) {
              toast.success(`${file.name} added to ${familyName} family`)
            } else {
              const error = await response.json()
              toast.error(`Failed to add style: ${error.error}`)
            }
          } catch (error) {
            console.error('Add style error:', error)
            toast.error(`Failed to add style for ${file.name}`)
          }
        }

        setAddingStyle(false)
        setAddingStyleFor('')
        loadFonts() // Reload fonts and families
      }
    }
    input.click()
  }
  
  // Delete individual style from family
  const deleteStyle = async (styleId: string, styleName: string, familyName: string) => {
    if (!confirm(`Delete the "${styleName}" style from ${familyName} family?`)) return

    try {
      const response = await fetch('/api/fonts-clean/delete-style', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ styleId })
      })

      if (response.ok) {
        toast.success(`Style "${styleName}" deleted`)
        loadFonts() // Reload to update family
      } else {
        const error = await response.json()
        toast.error(error.details || 'Failed to delete style')
      }
    } catch (error) {
      console.error('Delete style error:', error)
      toast.error('Failed to delete style')
    }
  }
  
  // Get family fonts for default style selection
  const getFamilyFonts = (familyName: string) => {
    return fonts.filter(font => font.family === familyName)
  }

  // Delete font
  const deleteFont = async (id: string) => {
    if (!confirm('Delete this font?')) return

    try {
      const response = await fetch('/api/fonts-clean/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })

      if (response.ok) {
        toast.success('Font deleted')
        loadFonts()
      } else {
        toast.error('Delete failed')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Delete failed')
    }
  }

  // Start editing
  const startEdit = (font: Font) => {
    setEditingFont(font.id)
    setEditForm({
      family: font.family,
      foundry: font.foundry,
      downloadLink: font.downloadLink || '',
      languages: [...font.languages],
      category: font.category || getDefaultCategory(font.collection || 'Text'),
      weight: font.weight || 400,
      styleTags: [...(font.styleTags || [])],
      collection: font.collection || 'Text',
      editableCreationDate: font.editableCreationDate || (font.creationDate ? 
        font.creationDate.includes('-01-01') ? font.creationDate.split('-')[0] : font.creationDate.split('T')[0] 
        : ''),
      editableVersion: font.editableVersion || font.version || '',
      editableLicenseType: font.editableLicenseType || font.license || 'Unknown'
    })
  }

  // Cancel edit
  const cancelEdit = () => {
    setEditingFont(null)
    setEditForm({ 
      family: '', 
      foundry: '', 
      downloadLink: '', 
      languages: [], 
      category: getDefaultCategory('Text'), 
      weight: 400, 
      styleTags: [],
      collection: 'Text',
      editableCreationDate: '',
      editableVersion: '',
      editableLicenseType: ''
    })
    setNewStyleTag('')
  }

  // Save edit
  const saveEdit = async (id: string) => {
    try {
      const response = await fetch('/api/fonts-clean/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          updates: editForm
        })
      })

      if (response.ok) {
        toast.success('Font updated')
        setEditingFont(null)
        loadFonts()
      } else {
        toast.error('Update failed')
      }
    } catch (error) {
      console.error('Update error:', error)
      toast.error('Update failed')
    }
  }

  // Toggle language
  const toggleLanguage = (language: string) => {
    setEditForm(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language]
    }))
  }
  
  // Toggle category
  const toggleCategory = (category: string) => {
    setEditForm(prev => ({
      ...prev,
      category: prev.category === category ? getDefaultCategory(prev.collection) : category
    }))
  }
  
  // Get default category for collection
  const getDefaultCategory = (collection: 'Text' | 'Display' | 'Weirdo') => {
    const defaults = { Text: 'Sans', Display: 'Sans-based', Weirdo: 'Experimental' }
    return defaults[collection]
  }
  
  // Toggle style tag
  const toggleStyleTag = (tag: string) => {
    setEditForm(prev => ({
      ...prev,
      styleTags: prev.styleTags.includes(tag)
        ? prev.styleTags.filter(t => t !== tag)
        : [...prev.styleTags, tag]
    }))
  }
  
  // Add new style tag
  const addNewStyleTag = () => {
    if (newStyleTag.trim() && !editForm.styleTags.includes(newStyleTag.trim())) {
      setEditForm(prev => ({
        ...prev,
        styleTags: [...prev.styleTags, newStyleTag.trim()]
      }))
      setNewStyleTag('')
    }
  }
  
  // Get all unique style tags from all fonts
  const getAllStyleTags = () => {
    const allTags = new Set<string>()
    fonts.forEach(font => {
      if (font.styleTags) {
        font.styleTags.forEach(tag => allTags.add(tag))
      }
    })
    return Array.from(allTags).sort()
  }

  // Filter and sort fonts
  const filteredAndSortedFonts = [...fonts]
    .filter(font => {
      if (filterCollection === 'all') return true
      return (font.collection || 'Text') === filterCollection
    })
    .sort((a, b) => {
      if (sortBy === 'new') {
        return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      } else {
        return a.family.localeCompare(b.family)
      }
    })
    
  // Get collection counts
  const collectionCounts = {
    all: fonts.length,
    Text: fonts.filter(f => (f.collection || 'Text') === 'Text').length,
    Display: fonts.filter(f => f.collection === 'Display').length,
    Weirdo: fonts.filter(f => f.collection === 'Weirdo').length
  }

  return (
    <>
      {/* Dynamic font loading for previews */}
      <style jsx global>{`
        ${fonts.map(font => `
          @font-face {
            font-family: "${font.family}";
            src: url("${font.blobUrl}");
            font-display: swap;
          }
        `).join('')}
      `}</style>
      
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Clean Font Admin</h1>
          <p className="text-muted-foreground">Blob + KV Font Management System</p>
        </div>

        {/* Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Fonts
            </h2>
          </CardHeader>
          <CardContent>
            <div 
              className="border-2 border-dashed border-border rounded-lg p-8 text-center transition-colors ds-hover-border-strong"
              onDrop={(e) => {
                e.preventDefault()
                handleUpload(e.dataTransfer.files)
              }}
              onDragOver={(e) => e.preventDefault()}
            >
              <Upload className="w-12 h-12 mx-auto ds-text-tert mb-4" />
              <p className="text-lg font-medium ds-text-prim mb-2">
                Drop font files here or click to browse
              </p>
              <p className="text-muted-foreground mb-4">
                Supports TTF, OTF, WOFF, WOFF2 (max 10MB)
              </p>
              <input
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                multiple
                className="hidden"
                id="font-upload"
                onChange={(e) => e.target.files && handleUpload(e.target.files)}
              />
              <Button 
                onClick={() => document.getElementById('font-upload')?.click()}
                disabled={uploading}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {uploading ? 'Uploading...' : 'Choose Files'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Font List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              Font Collection ({filteredAndSortedFonts.length}/{fonts.length})
            </h2>
            <div className="flex gap-2">
              <Button
                variant={sortBy === 'new' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('new')}
              >
                New
              </Button>
              <Button
                variant={sortBy === 'a-z' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('a-z')}
              >
                A-Z
              </Button>
              
              {selectedFamilies.size > 0 && (
                <input
                  type="text"
                  value={targetFamilyName}
                  onChange={(e) => setTargetFamilyName(e.target.value)}
                  placeholder="Target family name (e.g. 'DatDot')"
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={mergeSelectedFamilies}
                disabled={merging || selectedFamilies.size < 2 || !targetFamilyName.trim()}
                className="text-orange-600 border-orange-300 hover:bg-orange-50"
              >
                {merging ? 'Merging...' : `Merge ${selectedFamilies.size} Selected`}
              </Button>
            </div>
          </div>
          
          {/* Collection Filter */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={filterCollection === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterCollection('all')}
            >
              All ({collectionCounts.all})
            </Button>
            {COLLECTION_OPTIONS.map(col => (
              <Button
                key={col.value}
                variant={filterCollection === col.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterCollection(col.value)}
                title={col.description}
              >
                {col.label} ({collectionCounts[col.value]})
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading fonts...</div>
          ) : fonts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No fonts uploaded yet</div>
          ) : (
            <div className="space-y-1">
              {filteredAndSortedFonts.map((font) => {
                const isExpanded = expandedFonts.has(font.id)
                const isEditing = editingFont === font.id

                return (
                  <Card key={font.id} className="transition-all border border-border">
                    {/* Compact Header */}
                    <div 
                      className="flex items-center justify-between p-2 cursor-pointer ds-hover-fill-1"
                      onClick={() => {
                        const newExpanded = new Set(expandedFonts)
                        if (isExpanded) {
                          newExpanded.delete(font.id)
                        } else {
                          newExpanded.add(font.id)
                        }
                        setExpandedFonts(newExpanded)
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedFamilies.has(font.family)}
                          onChange={(e) => {
                            e.stopPropagation()
                            toggleFamilySelection(font.family)
                          }}
                          className="w-4 h-4"
                        />
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        <div>
                          <h3 className="text-sm font-medium">{font.family}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{new Date(font.uploadedAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{Math.round(font.fileSize / 1024)}KB</span>
                            <span>•</span>
                            <span>{font.format.toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-green-100 hover:text-green-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            quickAddStyle(font.family)
                          }}
                          disabled={addingStyle}
                          title="Add style to family"
                        >
                          <Upload className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            startEdit(font)
                          }}
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteFont(font.id)
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Compact Expanded Content */}
                    {isExpanded && (
                      <div className="border-t ds-bg-surface-2 p-2 border-border">
                        {isEditing ? (
                          /* Comprehensive Edit Form */
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-medium mb-1">Name</label>
                                <input
                                  type="text"
                                  value={editForm.family}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, family: e.target.value }))}
                                  className="w-full p-1 text-xs border rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">Author</label>
                                <input
                                  type="text"
                                  value={editForm.foundry}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, foundry: e.target.value }))}
                                  className="w-full p-1 text-xs border rounded"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1">Download Link</label>
                              <input
                                type="url"
                                value={editForm.downloadLink}
                                onChange={(e) => setEditForm(prev => ({ ...prev, downloadLink: e.target.value }))}
                                className="w-full p-1 text-xs border rounded"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1">Collection</label>
                              <div className="flex gap-1 mb-2">
                                {COLLECTION_OPTIONS.map(col => (
                                  <Button
                                    key={col.value}
                                    size="sm"
                                    className="h-6 px-2 text-xs flex-1"
                                    variant={editForm.collection === col.value ? "default" : "outline"}
                                    onClick={() => setEditForm(prev => ({ ...prev, collection: col.value }))}
                                    title={col.description}
                                  >
                                    {col.label}
                                  </Button>
                                ))}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-medium mb-1">Weight</label>
                                <select
                                  value={editForm.weight}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, weight: Number(e.target.value) }))}
                                  className="w-full p-1 text-xs border rounded"
                                >
                                  {WEIGHT_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">Category</label>
                                <div className="flex flex-wrap gap-1">
                                  {CATEGORY_OPTIONS[editForm.collection].map(cat => (
                                    <Button
                                      key={cat}
                                      size="sm"
                                      className="h-5 px-1 text-xs"
                                      variant={editForm.category === cat ? "default" : "outline"}
                                      onClick={() => toggleCategory(cat)}
                                    >
                                      {cat}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1">Languages</label>
                              <div className="flex flex-wrap gap-1">
                                {LANGUAGE_OPTIONS.map(lang => (
                                  <Button
                                    key={lang}
                                    size="sm"
                                    className="h-5 px-2 text-xs"
                                    variant={editForm.languages.includes(lang) ? "default" : "outline"}
                                    onClick={() => toggleLanguage(lang)}
                                  >
                                    {lang}
                                  </Button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1">Style Tags</label>
                              <div className="space-y-1">
                                <div className="flex flex-wrap gap-1">
                                  {getAllStyleTags().map(tag => (
                                    <Button
                                      key={tag}
                                      size="sm"
                                      className="h-5 px-2 text-xs"
                                      variant={editForm.styleTags.includes(tag) ? "default" : "outline"}
                                      onClick={() => toggleStyleTag(tag)}
                                    >
                                      {tag}
                                    </Button>
                                  ))}
                                </div>
                                <div className="flex gap-1">
                                  <input
                                    type="text"
                                    value={newStyleTag}
                                    onChange={(e) => setNewStyleTag(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && addNewStyleTag()}
                                    placeholder="Add new style tag"
                                    className="flex-1 p-1 text-xs border rounded"
                                  />
                                  <Button
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={addNewStyleTag}
                                    disabled={!newStyleTag.trim()}
                                  >
                                    Add
                                  </Button>
                                </div>
                              </div>
                            </div>
                            
                            {/* Variable Font Axes Display */}
                            {font.isVariable && font.variableAxes && font.variableAxes.length > 0 && (
                              <div>
                                <label className="block text-xs font-medium mb-1">Variable Font Axes</label>
                                <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
                                  {font.variableAxes.map((axis, index) => (
                                    <div key={index} className="flex justify-between items-center">
                                      <span className="font-medium">{axis.name} ({axis.axis}):</span>
                                      <span className="text-gray-600">
                                        {axis.min} → {axis.max} (default: {axis.default})
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Additional Editable Fields */}
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-xs font-medium mb-1">Creation Date</label>
                                <input
                                  type="text"
                                  value={editForm.editableCreationDate}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, editableCreationDate: e.target.value }))}
                                  placeholder="2023 or 2023-12-25"
                                  className="w-full p-1 text-xs border rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">Version</label>
                                <input
                                  type="text"
                                  value={editForm.editableVersion}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, editableVersion: e.target.value }))}
                                  placeholder="e.g. 1.0, 2.1.3"
                                  className="w-full p-1 text-xs border rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">License Type</label>
                                <select
                                  value={editForm.editableLicenseType}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, editableLicenseType: e.target.value }))}
                                  className="w-full p-1 text-xs border rounded"
                                >
                                  {LICENSE_TYPE_OPTIONS.map(license => (
                                    <option key={license} value={license}>
                                      {license}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            
                            <div className="flex gap-1">
                              <Button size="sm" className="h-6 px-2 text-xs" onClick={() => saveEdit(font.id)}>
                                <Save className="w-3 h-3 mr-1" />
                                Save
                              </Button>
                              <Button size="sm" className="h-6 px-2 text-xs" variant="outline" onClick={cancelEdit}>
                                <X className="w-3 h-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          /* Enhanced Display Mode */
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div className="space-y-1">
                              <p><span className="font-medium">Collection:</span> <Badge variant="secondary" className="text-xs px-1 py-0">{font.collection || 'Text'}</Badge></p>
                              <p>
                                <span className="font-medium">Style:</span> {font.style} 
                                {font.isVariable && <Badge variant="outline" className="text-xs px-1 py-0 ml-1">Variable</Badge>}
                                {font.italicStyle && <Badge variant="outline" className="text-xs px-1 py-0 ml-1">Italic</Badge>}
                                {font.isDefaultStyle && <Badge variant="default" className="text-xs px-1 py-0 ml-1">Default</Badge>}
                              </p>
                              <p><span className="font-medium">Weight:</span> {font.weight}</p>
                              <p><span className="font-medium">Category:</span> {font.category || getDefaultCategory(font.collection || 'Text')}</p>
                              <p><span className="font-medium">Author:</span> {font.foundry}</p>
                              <p><span className="font-medium">Version:</span> {font.editableVersion || font.version || 'Unknown'}</p>
                              <p><span className="font-medium">License:</span> {font.editableLicenseType || font.license || 'Unknown'}</p>
                              {font.editableCreationDate && (
                                <p><span className="font-medium">Created:</span> {new Date(font.editableCreationDate).toLocaleDateString()}</p>
                              )}
                              {font.glyphCount && (
                                <p><span className="font-medium">Glyphs:</span> {font.glyphCount}</p>
                              )}
                              
                              {/* Variable Font Axes in Display Mode */}
                              {font.isVariable && font.variableAxes && font.variableAxes.length > 0 && (
                                <div className="mt-2">
                                  <span className="font-medium">Variable Axes:</span>
                                  <div className="mt-1 space-y-1">
                                    {font.variableAxes.map((axis, index) => (
                                      <div key={index} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                        <span className="font-medium">{axis.name}</span> ({axis.axis}): {axis.min}–{axis.max}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="space-y-1">
                              {font.downloadLink && (
                                <p><span className="font-medium">Link:</span> <a href={font.downloadLink} target="_blank" className="text-blue-600 hover:underline truncate block">{font.downloadLink.length > 30 ? font.downloadLink.substring(0, 30) + '...' : font.downloadLink}</a></p>
                              )}
                              <div>
                                <span className="font-medium">Languages:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {font.languages.map(lang => (
                                    <Badge key={lang} variant="secondary" className="text-xs px-1 py-0">{lang}</Badge>
                                  ))}
                                </div>
                              </div>
                              {font.styleTags && font.styleTags.length > 0 && (
                                <div>
                                  <span className="font-medium">Style Tags:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {font.styleTags.map(tag => (
                                      <Badge key={tag} variant="outline" className="text-xs px-1 py-0">{tag}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {font.copyright && (
                                <p><span className="font-medium">Copyright:</span> <span className="text-gray-600 truncate">{font.copyright.length > 40 ? font.copyright.substring(0, 40) + '...' : font.copyright}</span></p>
                              )}
                              {font.license && (
                                <p><span className="font-medium">License:</span> <span className="text-gray-600 truncate">{font.license.length > 40 ? font.license.substring(0, 40) + '...' : font.license}</span></p>
                              )}
                              
                              {/* Family Styles Management */}
                              {(() => {
                                const familyFonts = getFamilyFonts(font.family)
                                return familyFonts.length > 1 ? (
                                  <div className="col-span-2 mt-2">
                                    <span className="font-medium text-xs">Family Styles ({familyFonts.length}):</span>
                                    <div className="mt-1 space-y-1">
                                      {familyFonts.map((familyFont, index) => (
                                        <div key={index} className="flex items-center justify-between text-xs bg-gray-100 px-2 py-1 rounded">
                                          <span>
                                            <span className="font-medium">{familyFont.style}</span> ({familyFont.weight})
                                            {familyFont.italicStyle && <span className="text-gray-500 ml-1">Italic</span>}
                                          </span>
                                          <div className="flex items-center gap-1">
                                            {familyFont.isDefaultStyle ? (
                                              <Badge variant="default" className="text-xs px-1 py-0">Default</Badge>
                                            ) : (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-5 px-2 text-xs"
                                                onClick={() => setDefaultStyle(font.family, familyFont.id)}
                                              >
                                                Set Default
                                              </Button>
                                            )}
                                            {familyFonts.length > 1 && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-5 w-5 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => deleteStyle(familyFont.id, familyFont.style, font.family)}
                                                title={`Delete ${familyFont.style} style`}
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    {/* Add Style Button inside family styles */}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="mt-2 h-6 px-2 text-xs bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                                      onClick={() => quickAddStyle(font.family)}
                                      disabled={addingStyle}
                                    >
                                      <Upload className="w-3 h-3 mr-1" />
                                      {addingStyle && addingStyleFor === font.family ? 'Adding...' : 'Add Style to Family'}
                                    </Button>
                                  </div>
                                ) : null
                              })()
                              }
                              
                              {/* Font Preview */}
                              <div className="col-span-2 mt-2">
                                <span className="font-medium text-xs">Preview:</span>
                                <div 
                                  className="mt-1 p-3 bg-white border rounded text-lg leading-tight"
                                  style={{
                                    fontFamily: `"${font.family}", sans-serif`,
                                    fontWeight: font.weight || 400
                                  }}
                                >
                                  <div className="text-xl mb-1">{font.family}</div>
                                  <div className="text-sm text-gray-600">
                                    The quick brown fox jumps over the lazy dog
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
      
      
      <Toaster />
    </div>
    </>
  )
}