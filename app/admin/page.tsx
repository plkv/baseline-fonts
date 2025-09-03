"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Shield, Moon, Sun } from "lucide-react"

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setDarkMode(isDark)
  }, [])

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
    <div className={`min-h-screen p-8 ${darkMode ? 'bg-stone-950' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto">
        <div className={`p-8 rounded-lg shadow ${darkMode ? 'bg-stone-900 border border-stone-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${darkMode ? 'bg-stone-100' : 'bg-gray-900'}`}>
                <Shield className={`w-6 h-6 ${darkMode ? 'text-stone-900' : 'text-white'}`} />
              </div>
              <div>
                <h1 className={`text-3xl font-bold ${darkMode ? 'text-stone-100' : 'text-gray-900'}`}>Font Management Admin</h1>
                <p className={`${darkMode ? 'text-stone-400' : 'text-gray-600'}`}>Upload and manage font files</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDarkMode(!darkMode)}
              className={`${darkMode ? 'text-stone-400 hover:text-stone-200 hover:bg-stone-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
          
          <div className="mb-8">
            <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-stone-100' : 'text-gray-900'}`}>Upload Font</h2>
            <input
              type="file"
              accept=".ttf,.otf"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUpload(file)
              }}
              disabled={isLoading}
              className={`block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold disabled:opacity-50 ${
                darkMode 
                  ? 'text-stone-400 file:bg-stone-800 file:text-stone-200 hover:file:bg-stone-700' 
                  : 'text-gray-500 file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100'
              }`}
            />
            {isLoading && (
              <div className={`mt-2 text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Uploading and processing font...</div>
            )}
          </div>
          
          <div className={`space-y-2 ${darkMode ? 'text-stone-400' : 'text-gray-600'}`}>
            <p>• Upload TTF or OTF files to add them to the catalog</p>
            <p>• Font metadata is automatically extracted using OpenType.js</p>
            <p>• Uploaded fonts will appear on the main page</p>
          </div>
        </div>
      </div>
    </div>
  )
}