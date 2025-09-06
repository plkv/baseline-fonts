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
}

const LANGUAGE_OPTIONS = [
  'Latin', 'Cyrillic', 'Greek', 'Arabic', 'Hebrew', 'Chinese', 'Japanese',
  'Korean', 'Thai', 'Vietnamese', 'Hindi', 'Bengali', 'Tamil', 'Telugu'
]

export default function CleanAdmin() {
  const [fonts, setFonts] = useState<Font[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'new' | 'a-z'>('new')
  const [expandedFonts, setExpandedFonts] = useState<Set<string>>(new Set())
  const [editingFont, setEditingFont] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    family: '',
    foundry: '',
    downloadLink: '',
    languages: [] as string[]
  })

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
      languages: [...font.languages]
    })
  }

  // Cancel edit
  const cancelEdit = () => {
    setEditingFont(null)
    setEditForm({ family: '', foundry: '', downloadLink: '', languages: [] })
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

  // Sort fonts
  const sortedFonts = [...fonts].sort((a, b) => {
    if (sortBy === 'new') {
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    } else {
      return a.family.localeCompare(b.family)
    }
  })

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
              Font Collection ({fonts.length})
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

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading fonts...</div>
          ) : fonts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No fonts uploaded yet</div>
          ) : (
            <div className="space-y-2">
              {sortedFonts.map((font) => {
                const isExpanded = expandedFonts.has(font.id)
                const isEditing = editingFont === font.id

                return (
                  <Card key={font.id} className="transition-all">
                    {/* Collapsed Header */}
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer"
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
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <div>
                          <h3 className="font-medium">{font.family}</h3>
                          <p className="text-sm text-gray-500">
                            {new Date(font.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            startEdit(font)
                          }}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteFont(font.id)
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <CardContent>
                        {isEditing ? (
                          /* Edit Form */
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium mb-1">Name</label>
                              <input
                                type="text"
                                value={editForm.family}
                                onChange={(e) => setEditForm(prev => ({ ...prev, family: e.target.value }))}
                                className="w-full p-2 border rounded"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Author</label>
                              <input
                                type="text"
                                value={editForm.foundry}
                                onChange={(e) => setEditForm(prev => ({ ...prev, foundry: e.target.value }))}
                                className="w-full p-2 border rounded"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Link</label>
                              <input
                                type="url"
                                value={editForm.downloadLink}
                                onChange={(e) => setEditForm(prev => ({ ...prev, downloadLink: e.target.value }))}
                                className="w-full p-2 border rounded"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Languages</label>
                              <div className="flex flex-wrap gap-2">
                                {LANGUAGE_OPTIONS.map(lang => (
                                  <Button
                                    key={lang}
                                    size="sm"
                                    variant={editForm.languages.includes(lang) ? "default" : "outline"}
                                    onClick={() => toggleLanguage(lang)}
                                  >
                                    {lang}
                                  </Button>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={() => saveEdit(font.id)}>
                                <Save className="w-4 h-4 mr-2" />
                                Save
                              </Button>
                              <Button variant="outline" onClick={cancelEdit}>
                                <X className="w-4 h-4 mr-2" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          /* Display Mode */
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p><strong>Style:</strong> {font.style}</p>
                              <p><strong>Weight:</strong> {font.weight}</p>
                              <p><strong>Format:</strong> {font.format.toUpperCase()}</p>
                              <p><strong>Size:</strong> {Math.round(font.fileSize / 1024)}KB</p>
                            </div>
                            <div>
                              <p><strong>Author:</strong> {font.foundry}</p>
                              {font.downloadLink && (
                                <p><strong>Link:</strong> <a href={font.downloadLink} target="_blank" className="text-blue-600 hover:underline">{font.downloadLink}</a></p>
                              )}
                              <div className="mt-2">
                                <strong>Languages:</strong>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {font.languages.map(lang => (
                                    <Badge key={lang} variant="secondary">{lang}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
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