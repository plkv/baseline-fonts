"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface FontData {
  id: number
  name: string
  family: string
  style: string
  category: string
  foundry: string
  collection: 'Text' | 'Display' | 'Weirdo'
  styleTags: string[]
  url?: string
  downloadLink?: string
  isVariable: boolean
  availableWeights: number[]
}

export default function V2Page() {
  const [fonts, setFonts] = useState<FontData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCollection, setSelectedCollection] = useState<'Text' | 'Display' | 'Weirdo'>('Text')
  const [searchQuery, setSearchQuery] = useState('')
  const [previewText, setPreviewText] = useState('Grotesk')

  useEffect(() => {
    const loadFonts = async () => {
      try {
        const response = await fetch('/api/fonts-clean/list', { cache: 'no-store' })
        const data = await response.json()
        if (data.success && Array.isArray(data.fonts)) {
          setFonts(data.fonts)
        }
      } catch (error) {
        console.error('Failed to load fonts:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadFonts()
  }, [])

  const filteredFonts = fonts
    .filter(font => font.collection === selectedCollection)
    .filter(font =>
      searchQuery === '' ||
      font.family.toLowerCase().includes(searchQuery.toLowerCase()) ||
      font.foundry.toLowerCase().includes(searchQuery.toLowerCase())
    )

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl z-50">
        <div className="max-w-[2000px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                ← v1
              </Link>
              <h1 className="text-xl font-medium tracking-tight">typedump v2</h1>
              <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg p-1">
                {(['Text', 'Display', 'Weirdo'] as const).map((collection) => (
                  <button
                    key={collection}
                    onClick={() => setSelectedCollection(collection)}
                    className={`px-4 py-1.5 text-sm rounded-md transition-all ${
                      selectedCollection === collection
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    {collection}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search fonts..."
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-900 rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 w-64"
              />
              <input
                type="text"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="Preview text..."
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-900 rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 w-64"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[2000px] mx-auto px-6 py-12">
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-zinc-400">Loading fonts...</div>
          </div>
        ) : filteredFonts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="text-zinc-400 mb-2">No fonts found</div>
            <div className="text-sm text-zinc-500">Try adjusting your filters</div>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredFonts.map((font) => (
              <div
                key={font.id}
                className="group border-b border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors"
              >
                <div className="py-8">
                  {/* Font Info */}
                  <div className="flex items-baseline justify-between mb-6">
                    <div className="flex items-baseline gap-4">
                      <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {font.family}
                      </h2>
                      <span className="text-xs text-zinc-400">
                        {font.foundry}
                      </span>
                      {font.isVariable && (
                        <span className="text-xs bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-2 py-0.5 rounded">
                          Variable
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {font.styleTags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs text-zinc-500 dark:text-zinc-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Preview */}
                  <div
                    className="text-6xl leading-tight text-zinc-900 dark:text-zinc-100 font-normal break-words"
                    style={{
                      fontFamily: `"${font.family}", system-ui, sans-serif`,
                    }}
                  >
                    {previewText}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-24">
        <div className="max-w-[2000px] mx-auto px-6 py-8">
          <div className="flex items-center justify-between text-sm text-zinc-500">
            <div>
              {filteredFonts.length} {filteredFonts.length === 1 ? 'font' : 'fonts'} in {selectedCollection}
            </div>
            <div>
              typedump v2.0 — cleaner, simpler
            </div>
          </div>
        </div>
      </footer>

      {/* Dynamic font loading */}
      <style jsx global>{`
        ${fonts
          .filter(font => font.url)
          .map(
            (font) => `
          @font-face {
            font-family: "${font.family}";
            src: url("${font.url}");
            font-display: swap;
          }
        `
          )
          .join('\n')}
      `}</style>
    </div>
  )
}
