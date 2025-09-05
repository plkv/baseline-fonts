"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, Trash2, FileText } from "lucide-react"
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
}

export default function SimpleAdmin() {
  const [fonts, setFonts] = useState<Font[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)

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

        {/* Font Grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Font Collection ({fonts.length})
          </h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading fonts...</div>
            </div>
          ) : fonts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500">No fonts uploaded yet. Upload your first font above.</div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {fonts.map((font) => (
                <Card key={font.filename} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">{font.family}</h3>
                        <p className="text-sm text-gray-500">{font.style} {font.weight}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(font.filename, font.family)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {/* Font Preview */}
                    <div 
                      className="bg-gray-100 rounded-lg p-4 mb-3"
                      style={{
                        fontFamily: `"${font.family}", system-ui, sans-serif`,
                        fontWeight: font.weight,
                        fontSize: '24px'
                      }}
                    >
                      The quick brown fox
                    </div>
                    
                    {/* Font Details */}
                    <div className="space-y-2">
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline">{font.format.toUpperCase()}</Badge>
                        <Badge variant="outline">{font.category}</Badge>
                        <Badge variant="outline">{Math.round(font.fileSize / 1024)}KB</Badge>
                      </div>
                      <div className="text-xs text-gray-500">
                        <div>Foundry: {font.foundry}</div>
                        <div>File: {font.filename}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Toaster position="top-center" richColors />
    </div>
  )
}