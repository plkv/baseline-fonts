"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, Trash2, FileText, ChevronDown, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { Toaster } from "sonner"

interface Font {
  filename: string
  family: string
  style: string
  weight: number
  format: string
  fileSize: number
  category: string
  foundry: string
  url: string
  uploadDate?: string
}

export default function SimpleAdmin() {
  const [fonts, setFonts] = useState<Font[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'new' | 'a-z'>('new')
  const [expandedFonts, setExpandedFonts] = useState<Set<string>>(new Set())

  // Load fonts from API
  const loadFonts = async () => {
    try {
      const response = await fetch('/api/fonts/list-v2')
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

  // Upload font
  const handleUpload = async (file: File) => {
    if (!file.name.match(/\.(ttf|otf|woff|woff2)$/i)) {
      toast.error('Invalid file type. Use TTF, OTF, WOFF, or WOFF2')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum 10MB allowed')
      return
    }

    setUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/fonts/upload-v2', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        toast.success(`Font "${result.font.family}" uploaded successfully`)
        loadFonts() // Reload fonts
      } else {
        toast.error(result.message || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  // Delete font
  const handleDelete = async (filename: string, family: string) => {
    if (!confirm(`Delete "${family}"?`)) return

    try {
      const response = await fetch(`/api/fonts/delete-v2?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Font deleted successfully')
        loadFonts() // Reload fonts
      } else {
        const error = await response.json()
        toast.error(error.message || 'Delete failed')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Delete failed')
    }
  }

  // File drop handler
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    files.forEach(handleUpload)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // Toggle font expansion
  const toggleFontExpansion = (filename: string) => {
    setExpandedFonts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(filename)) {
        newSet.delete(filename)
      } else {
        newSet.add(filename)
      }
      return newSet
    })
  }

  // Sort fonts based on selected option
  const sortedFonts = [...fonts].sort((a, b) => {
    if (sortBy === 'new') {
      // Sort by upload date (newest first), fallback to filename if no date
      const dateA = a.uploadDate ? new Date(a.uploadDate).getTime() : 0
      const dateB = b.uploadDate ? new Date(b.uploadDate).getTime() : 0
      return dateB - dateA
    } else {
      // Sort alphabetically by family name
      return a.family.localeCompare(b.family)
    }
  })

  // Format upload date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  useEffect(() => {
    loadFonts()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Font Admin</h1>
          <p className="text-gray-600">Upload, preview, and manage your font collection</p>
        </div>

        {/* Upload Area */}
        <Card className="mb-8">
          <CardHeader>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Fonts
            </h2>
          </CardHeader>
          <CardContent>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
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
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  files.forEach(handleUpload)
                  e.target.value = '' // Reset input
                }}
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
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Font Collection ({fonts.length})
            </h2>
            
            {/* Sort Options */}
            {fonts.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant={sortBy === 'new' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('new')}
                  className="text-xs"
                >
                  Newest
                </Button>
                <Button
                  variant={sortBy === 'a-z' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('a-z')}
                  className="text-xs"
                >
                  A-Z
                </Button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading fonts...</div>
            </div>
          ) : fonts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500">No fonts uploaded yet. Upload your first font above.</div>
            </div>
          ) : (
            <div className="space-y-1">
              {sortedFonts.map((font) => {
                const isExpanded = expandedFonts.has(font.filename)
                return (
                  <div key={font.filename} className="border border-gray-200 rounded-md overflow-hidden">
                    {/* Collapsed Row - Ultra Compact */}
                    <div 
                      className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleFontExpansion(font.filename)}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {isExpanded ? (
                          <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-sm text-gray-900 truncate">{font.family}</span>
                            <span className="text-xs text-gray-500 flex-shrink-0">{formatDate(font.uploadDate)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(font.filename, font.family)
                        }}
                        className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Expanded Details - Compact */}
                    {isExpanded && (
                      <div className="border-t bg-gray-50 px-3 py-2">
                        <div className="grid md:grid-cols-2 gap-3">
                          {/* Font Preview */}
                          <div>
                            <div 
                              className="bg-white rounded p-2 text-lg border"
                              style={{
                                fontFamily: `"${font.family}", system-ui, sans-serif`,
                                fontWeight: font.weight
                              }}
                            >
                              The quick brown fox
                            </div>
                          </div>
                          
                          {/* Font Details */}
                          <div className="space-y-1">
                            <div className="flex gap-1 flex-wrap">
                              <Badge variant="outline" className="text-xs px-1 py-0">{font.format.toUpperCase()}</Badge>
                              <Badge variant="outline" className="text-xs px-1 py-0">{font.category}</Badge>
                              <Badge variant="outline" className="text-xs px-1 py-0">{Math.round(font.fileSize / 1024)}KB</Badge>
                            </div>
                            <div className="text-xs text-gray-600 space-y-0.5">
                              <div>{font.style} {font.weight}</div>
                              <div>{font.foundry}</div>
                              <div className="truncate">{font.filename}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <Toaster position="top-center" richColors />
    </div>
  )
}