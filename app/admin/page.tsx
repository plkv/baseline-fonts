"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Shield } from "lucide-react"

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleUpload = async (file: File) => {
    if (!file) return
    
    setIsLoading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/fonts/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      if (result.success) {
        alert(`Font uploaded successfully!\nFamily: ${result.font.family}\nStyle: ${result.font.style}\nWeight: ${result.font.weight}`)
      } else {
        alert('Upload failed: ' + result.error)
      }
    } catch (error) {
      alert('Upload error: ' + error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-8 rounded-lg shadow">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Font Management Admin</h1>
              <p className="text-gray-600">Upload and manage font files</p>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Upload Font</h2>
            <input
              type="file"
              accept=".ttf,.otf"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUpload(file)
              }}
              disabled={isLoading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100 disabled:opacity-50"
            />
            {isLoading && (
              <div className="mt-2 text-sm text-blue-600">Uploading and processing font...</div>
            )}
          </div>
          
          <div className="text-gray-600 space-y-2">
            <p>• Upload TTF or OTF files to add them to the catalog</p>
            <p>• Font metadata is automatically extracted using OpenType.js</p>
            <p>• Uploaded fonts will appear on the main page</p>
          </div>
        </div>
      </div>
    </div>
  )
}