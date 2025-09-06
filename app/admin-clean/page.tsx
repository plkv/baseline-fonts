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

const CATEGORY_OPTIONS = [
  'Sans Serif', 'Serif', 'Monospace', 'Display', 'Script', 'Pixel', 'Symbol', 'Decorative'
]

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
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
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

  // Load fonts
  const loadFonts = async () => {
    try {
      const response = await fetch('/api/fonts-clean/list')
      if (response.ok) {
        const data = await response.json()
        setFonts(data.fonts || [])
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
    loadFonts() // Reload fonts
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
      category: font.category || 'Sans Serif',
      weight: font.weight || 400,
      styleTags: [...(font.styleTags || [])],
      collection: font.collection || 'Text',
      editableCreationDate: font.editableCreationDate || font.creationDate?.split('T')[0] || '',
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
      category: 'Sans Serif', 
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
      category: prev.category === category ? 'Sans Serif' : category
    }))
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Clean Font Admin</h1>
          <p className="text-gray-600">Blob + KV Font Management System</p>
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
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
              onDrop={(e) => {
                e.preventDefault()
                handleUpload(e.dataTransfer.files)
              }}
              onDragOver={(e) => e.preventDefault()}
            >
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Drop font files here or click to browse
              </p>
              <p className="text-gray-500 mb-4">
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
                className="bg-blue-600 hover:bg-blue-700"
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
            <div className="text-center py-8 text-gray-500">Loading fonts...</div>
          ) : fonts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No fonts uploaded yet</div>
          ) : (
            <div className="space-y-1">
              {filteredAndSortedFonts.map((font) => {
                const isExpanded = expandedFonts.has(font.id)
                const isEditing = editingFont === font.id

                return (
                  <Card key={font.id} className="transition-all border">
                    {/* Compact Header */}
                    <div 
                      className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50"
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
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        <div>
                          <h3 className="text-sm font-medium">{font.family}</h3>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
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
                      <div className="border-t bg-gray-50 p-2">
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
                                  {CATEGORY_OPTIONS.map(cat => (
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
                                  type="date"
                                  value={editForm.editableCreationDate}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, editableCreationDate: e.target.value }))}
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
                              <p><span className="font-medium">Style:</span> {font.style} {font.isVariable && <Badge variant="outline" className="text-xs px-1 py-0 ml-1">Variable</Badge>}</p>
                              <p><span className="font-medium">Weight:</span> {font.weight}</p>
                              <p><span className="font-medium">Category:</span> {font.category || 'Sans Serif'}</p>
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
  )
}