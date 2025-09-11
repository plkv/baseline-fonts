"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { usePathname } from "next/navigation"
import { Slider } from "@/components/ui/slider"
import { ControlledTextPreview } from "@/components/ui/font/ControlledTextPreview"
import { canonicalFamilyName } from "@/lib/font-naming"
import { shortHash } from "@/lib/hash"

// Font interface for our API data
interface FontData {
  id: number
  name: string
  family: string
  style: string
  category: string
  styles: number
  type: "Variable" | "Static"
  author: string
  fontFamily: string
  availableWeights: number[]
  hasItalic: boolean
  filename: string
  url?: string
  downloadLink?: string
  variableAxes?: Array<{
    name: string
    axis: string
    min: number
    max: number
    default: number
  }>
  openTypeFeatures?: string[]
  _familyFonts?: any[] // Store original font data for style selection
  _availableStyles?: Array<{
    weight: number
    styleName: string
    isItalic: boolean
    font?: any // Reference to original font for static fonts
  }> // Structured style data for style selection
  collection: 'Text' | 'Display' | 'Weirdo'
  styleTags: string[]
  categories: string[]
}

const textPresets = ["Names", "Key Glyphs", "Basic", "Paragraph", "Brands"]
// Languages will be dynamically generated from current collection
const weights = [100, 200, 300, 400, 500, 600, 700, 800, 900]

const getPresetContent = (preset: string, fontName: string) => {
  switch (preset) {
    case "Names":
      return fontName
    case "Key Glyphs":
      return 'RKFJIGCQ aueoyrgsltf 0123469 ≪"(@&?;€$© ->…'
    case "Basic":
      return "ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 !@#$%^&*()_+-=[]{}|;':\",./<>?"
    case "Paragraph":
      const paragraphs = [
        "Balenciaga, Our Legacy, and Acne Studios continue to redefine avant-garde style, pushing silhouettes beyond conventional logic. Designers like Demna and Jonny Johansson layer irony with tailoring, mixing XXL coats, micro-bags, raw denim, and surreal proportions. Runway shows in Paris, Milan, and New York thrive on spectacle: flashing lights, fragmented beats, and cryptic slogans. What once felt absurd now becomes street uniform, merging couture with hoodie culture. Numbers matter too: limited drops of 500 units, resale prices soaring +300%, collectors chasing hype like traders. Fashion turns volatility into its core language.",
        "The global market trades on symbols: AAPL at $212.45, ETH climbing +5.6%, EUR/USD swinging. Every decimal moves billions. Exchanges speak a secret dialect of IPO, ETF, CAGR, ROI. Investors chase 12% annual yield, hedge funds leverage ×10, while regulators warn of bubbles. Platforms like Robinhood and Revolut blur banking and gaming, reducing risk to a tap, turning volatility into entertainment. Graphs spike red → green → red, headlines shout \"RECORD CLOSE!\" and algorithms decide faster than humans blink. Finance becomes performance, a theater of numbers where % defines power more than words.",
        "Every startup dreams of unicorn status: $1B valuation, growth curve slashing up at 45°. Founders pitch \"AI-powered SaaS\" or \"climate-tech with blockchain backbone,\" their decks filled with KPIs, TAM, CAC vs LTV. Venture capitalists reply with buzz: pre-seed, Series A, ARR, burn rate. Acceleration feels like survival; one quarter without +20% and the board panics. Yet behind the charts are restless teams in coworking hubs, 3 a.m. Slack pings, endless beta launches. Success is both hype and math, a fragile balance between story and spreadsheet, where a single slide decides millions wired.",
        "Barcelona glows with contradictions: Gaudí's Sagrada Família still climbing skyward since 1882, while Torre Glòries mirrors LED grids in real time. Eixample blocks form geometric order, yet life spills chaotic with scooters, cava bottles, and late-night vermut. Remote workers fill cafés, toggling between Figma boards and Zoom calls, chasing deadlines across GMT+1. The port counts containers and cruise ships, the beach counts sunsets and tourists. Art, sport, fintech, and fashion overlap in one Mediterranean arena. Every corner feels alive with accents, from Passeig de Gràcia boutiques to hidden tapas bars in El Raval."
      ]
      return paragraphs[Math.floor(Math.random() * paragraphs.length)]
    case "Brands":
      const brandSets = [
        "Maison Margiela • Off-White • Y/Project • Rimowa • A-Cold-Wall* • Figma • Balenciaga • OpenAI • Byredo",
        "Figma • Arc'teryx • Rimowa • Aimé Leon Dore • Balenciaga • Klarna • Off-White • SpaceX • Notion",
        "OpenAI • Arc'teryx • Maison Margiela • A-Cold-Wall* • Y/Project • Klarna • Byredo • Balenciaga • SpaceX",
        "Byredo • Maison Margiela • Notion • Figma • Off-White • Rimowa • OpenAI • Balenciaga • Arc'teryx"
      ]
      return brandSets[Math.floor(Math.random() * brandSets.length)]
    default:
      return fontName
  }
}

export default function FontLibrary() {
  const pathname = usePathname()
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const selectRefs = useRef<Record<number, HTMLSelectElement | null>>({})
  
  // Font Data State  
  const [fonts, setFonts] = useState<FontData[]>([])
  const [isLoadingFonts, setIsLoadingFonts] = useState(true)
  const [customText, setCustomText] = useState("")
  const [displayMode, setDisplayMode] = useState<"Text" | "Display" | "Weirdo">("Text")
  const [selectedPreset, setSelectedPreset] = useState("Names")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedStyles, setSelectedStyles] = useState<string[]>([])
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])
  const [selectedWeights, setSelectedWeights] = useState<number[]>([])
  const [isItalic, setIsItalic] = useState(false)
  const [fontWeightSelections, setFontWeightSelections] = useState<Record<number, { weight: number; italic: boolean }>>(
    {},
  )
  const [textSize, setTextSize] = useState([72])
  const [lineHeight, setLineHeight] = useState([120])
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")
  const [sortBy, setSortBy] = useState("Date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc") // New = desc, Old = asc
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())
  
  // Stable preview font per collection (don't change during session)
  const previewFontsRef = useRef<Record<'Text'|'Display'|'Weirdo', string>>({ Text: '', Display: '', Weirdo: '' })
  const getStablePreviewFontForCollection = (collection: "Text" | "Display" | "Weirdo") => {
    if (!previewFontsRef.current[collection]) {
      const candidates = fonts.filter(f => f.collection === collection)
      if (candidates.length) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)]
        previewFontsRef.current[collection] = pick?.fontFamily || "Inter Variable, system-ui, sans-serif"
      }
    }
    return previewFontsRef.current[collection] || "Inter Variable, system-ui, sans-serif"
  }
  const [fontOTFeatures, setFontOTFeatures] = useState<Record<number, Record<string, boolean>>>({})
  const [fontVariableAxes, setFontVariableAxes] = useState<Record<number, Record<string, number>>>({})
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const [focusedFontId, setFocusedFontId] = useState<number | null>(null)

  const [editingElementRef, setEditingElementRef] = useState<HTMLDivElement | null>(null)
  const [textCursorPosition, setTextCursorPosition] = useState(0)

  // Load fonts from our API
  const loadFonts = useCallback(async () => {
    try {
      setIsLoadingFonts(true)
      console.log('🔄 Loading fonts from API...')
      // Prefer normalized families endpoint; fallback to legacy list
      let handled = false
      try {
        const respFamilies = await fetch('/api/families')
        if (respFamilies.ok) {
          const fd = await respFamilies.json()
          console.log('📋 Families API Response:', fd)
          if (fd.success && Array.isArray(fd.families)) {
            // Inject CSS directly from normalized families
            try {
              const { buildFontCSS } = await import('@/lib/font-css')
              const css = buildFontCSS(fd.families)
              const existing = document.querySelector('style[data-font-css]')
              if (existing) existing.remove()
              if (css) {
                const el = document.createElement('style')
                el.setAttribute('data-font-css', 'true')
                el.textContent = css
                document.head.appendChild(el)
              }
            } catch (e) {
              console.warn('Failed to build font CSS from families:', e)
            }
            const catalogFonts: FontData[] = fd.families.map((family: any, index: number) => {
              const familyFonts = family.variants || []
              const representativeFont =
                familyFonts.find((v: any) => v.isDefaultStyle) ||
                familyFonts.find((v: any) => !v.isItalic) ||
                familyFonts[0]
              if (!representativeFont) return null

              const isVariable = Boolean(family.isVariable) || familyFonts.some((v: any) => v.isVariable)
              let availableWeights: number[] = []
              let availableStylesWithWeights: any[] = []

              if (isVariable) {
                const weightAxes = familyFonts
                  .filter((v: any) => v.variableAxes?.some((a: any) => a.axis === 'wght'))
                  .map((v: any) => v.variableAxes?.find((a: any) => a.axis === 'wght'))
                  .filter(Boolean)
                if (weightAxes.length > 0) {
                  const minWeight = Math.min(...weightAxes.map((axis: any) => axis.min))
                  const maxWeight = Math.max(...weightAxes.map((axis: any) => axis.max))
                  availableWeights = [100,200,300,400,500,600,700,800,900].filter(w => w >= minWeight && w <= maxWeight)
                } else {
                  availableWeights = [100,200,300,400,500,600,700,800,900]
                }
                availableStylesWithWeights = availableWeights.map((weight) => ({
                  weight,
                  styleName: getStyleNameFromWeight(weight, false),
                  isItalic: false,
                }))
                const hasItalic = familyFonts.some((v: any) => v.isItalic)
                if (hasItalic) {
                  availableStylesWithWeights = [
                    ...availableStylesWithWeights,
                    ...availableWeights.map((weight) => ({
                      weight,
                      styleName: getStyleNameFromWeight(weight, true),
                      isItalic: true,
                    })),
                  ]
                }
              } else {
                // Static family: build unique styles by weight + italic to avoid duplicate "Regular" entries
                const allFontStyles = familyFonts.map((v: any) => ({
                  weight: v.weight || 400,
                  styleName: v.styleName || 'Regular',
                  isItalic: Boolean(v.isItalic),
                  font: v,
                }))
                const unique = new Map<string, any>()
                for (const s of allFontStyles) {
                  const key = `${s.weight}-${s.isItalic ? 'i' : 'n'}`
                  if (!unique.has(key)) unique.set(key, s)
                }
                availableStylesWithWeights = Array.from(unique.values()).sort((a: any, b: any) => {
                  if (a.weight !== b.weight) return a.weight - b.weight
                  return a.isItalic ? 1 : -1
                })
                availableWeights = [...new Set(Array.from(unique.values()).map((s: any) => s.weight))].sort((a: number, b: number) => a - b)
              }

              const hasItalic = familyFonts.some((v: any) => v.isItalic)
              const finalType = isVariable ? 'Variable' : 'Static'

              return {
                id: index + 1,
                name: family.name,
                family: family.name,
                style: `${familyFonts.length} style${familyFonts.length !== 1 ? 's' : ''}`,
                category: Array.isArray(family.category) ? (family.category[0] || 'Sans') : (family.category || 'Sans'),
                styles: familyFonts.length,
                type: finalType,
                author: family.foundry || 'Unknown',
                fontFamily: `"${canonicalFamilyName(family.name)}-${shortHash(canonicalFamilyName(family.name)).slice(0,6)}", system-ui, sans-serif`,
                availableWeights,
                hasItalic,
                filename: representativeFont.originalFilename || representativeFont.filename,
                url: representativeFont.blobUrl,
                downloadLink: family.downloadLink,
                variableAxes: representativeFont.variableAxes,
                openTypeFeatures: representativeFont.openTypeFeatures,
                _familyFonts: familyFonts.map((v: any) => ({
                  weight: v.weight,
                  style: v.styleName,
                  isItalic: v.isItalic,
                  blobUrl: v.blobUrl,
                  url: v.blobUrl,
                  downloadLink: v.downloadLink,
                  variableAxes: v.variableAxes,
                  openTypeFeatures: v.openTypeFeatures,
                })),
                _availableStyles: availableStylesWithWeights,
                collection: family.collection || 'Text',
                styleTags: family.styleTags || [],
                languages: Array.isArray(family.languages) ? family.languages : ['Latin'],
                categories: Array.isArray(family.category) ? family.category : [family.category || 'Sans'],
              } as FontData
            }).filter(Boolean)

            setFonts(catalogFonts as FontData[])
            console.log(`📝 Loaded ${catalogFonts.length} families from /api/families`)
            handled = true
          }
        }
      } catch (e) {
        console.warn('Families endpoint not available, falling back:', e)
      }

      if (!handled) {
        const response = await fetch('/api/fonts-clean/list')
        if (response.ok) {
          const data = await response.json()
          console.log('📋 API Response:', data)
          if (data.success && data.fonts) {
          // Group fonts by family name to avoid duplicates
          const fontsByFamily = new Map<string, any[]>()
          data.fonts.forEach((font: any) => {
            const familyName = font.family || font.name
            if (!fontsByFamily.has(familyName)) {
              fontsByFamily.set(familyName, [])
            }
            fontsByFamily.get(familyName)!.push(font)
          })

          // Transform grouped families to catalog UI format
            const catalogFonts: FontData[] = Array.from(fontsByFamily.entries()).map(([familyName, familyFonts], index) => {
            try {
            // Choose the best representative font: 
            // 1. Font marked as default style
            // 2. Non-italic font (regular/normal)
            // 3. First font as fallback
            const representativeFont = familyFonts?.find((f: any) => f.isDefaultStyle) ||
              familyFonts?.find((f: any) => !f.style?.toLowerCase().includes('italic') && !f.style?.toLowerCase().includes('oblique')) ||
              familyFonts?.[0]
            
            if (!representativeFont) {
              console.warn(`No representative font found for family: ${familyName}`)
              return null
            }
            
            console.log(`Processing family: ${familyName}, fonts: ${familyFonts.length}`);
            
            // Analyze available weight+style combinations
            const regularFonts = familyFonts.filter(f => !f.style?.toLowerCase().includes('italic'))
            const italicFonts = familyFonts.filter(f => f.style?.toLowerCase().includes('italic'))
            const hasItalic = italicFonts.length > 0
            const isVariable = familyFonts.some(f => f.isVariable)
            
            // Calculate available weights and styles for both variable and static fonts
            let availableWeights
            let availableStylesWithWeights = []
            
            if (isVariable) {
              // For variable fonts, use weight axis range or common weight stops
              const weightAxes = familyFonts
                .filter(f => f.variableAxes?.some(axis => axis.axis === 'wght'))
                .map(f => f.variableAxes?.find(axis => axis.axis === 'wght'))
                .filter(Boolean)
              
              if (weightAxes.length > 0) {
                // Use weight range from variable axis
                const minWeight = Math.min(...weightAxes.map(axis => axis.min))
                const maxWeight = Math.max(...weightAxes.map(axis => axis.max))
                // Common weight stops within the range
                availableWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900]
                  .filter(w => w >= minWeight && w <= maxWeight)
              } else {
                // Fallback for variable fonts without clear weight axis
                availableWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900]
              }
              
              // For variable fonts, generate style names from weights
              availableStylesWithWeights = availableWeights.map(weight => ({
                weight,
                styleName: getStyleNameFromWeight(weight, false),
                isItalic: false
              }))
              
              // Add italic variants if any font in family has italic capability
              if (hasItalic) {
                const italicStyles = availableWeights.map(weight => ({
                  weight,
                  styleName: getStyleNameFromWeight(weight, true),
                  isItalic: true
                }))
                availableStylesWithWeights = [...availableStylesWithWeights, ...italicStyles]
              }
            } else {
              // For static fonts, use actual font styles and weights, but de-duplicate by weight + italic
              const allFontStyles = familyFonts.map(font => ({
                weight: font.weight || 400,
                styleName: font.style || 'Regular',
                isItalic: font.style?.toLowerCase().includes('italic') || font.style?.toLowerCase().includes('oblique') || false,
                font: font // Store reference to original font
              }))
              const unique = new Map<string, typeof allFontStyles[number]>()
              for (const s of allFontStyles) {
                const key = `${s.weight}-${s.isItalic ? 'i' : 'n'}`
                if (!unique.has(key)) unique.set(key, s)
              }
              // Sort by weight, then regular before italic
              availableStylesWithWeights = Array.from(unique.values()).sort((a, b) => {
                if (a.weight !== b.weight) return a.weight - b.weight
                return a.isItalic ? 1 : -1
              })
              availableWeights = [...new Set(Array.from(unique.values()).map(style => style.weight))].sort((a, b) => a - b)
            }
            
            const finalType = isVariable ? "Variable" : "Static"
            
            return {
              id: index + 1,
              name: familyName,
              family: familyName,
              style: `${familyFonts.length} style${familyFonts.length !== 1 ? 's' : ''}`,
              category: Array.isArray(representativeFont.category) 
                ? representativeFont.category[0] || "Sans" // Use first category for UI compatibility
                : (representativeFont.category || "Sans"),
              styles: familyFonts.length,
              type: finalType,
              author: representativeFont.foundry || "Unknown",
              fontFamily: `"${canonicalFamilyName(familyName)}-${shortHash(canonicalFamilyName(familyName)).slice(0,6)}", system-ui, sans-serif`,
              availableWeights: availableWeights,
              hasItalic: hasItalic,
              filename: representativeFont.filename,
              url: representativeFont.url || representativeFont.blobUrl,
              downloadLink: representativeFont.downloadLink,
              variableAxes: representativeFont.variableAxes,
              openTypeFeatures: representativeFont.openTypeFeatures,
              // Store family fonts data for style selection
              _familyFonts: familyFonts,
              // Store structured style data for proper style selection
              _availableStyles: availableStylesWithWeights,
              // Add collection and style tags for filtering
              collection: representativeFont.collection || 'Text',
              styleTags: representativeFont.styleTags || [],
              languages: Array.isArray(representativeFont.languages) ? representativeFont.languages : ['Latin'],
              categories: Array.isArray(representativeFont.category) ? representativeFont.category : [representativeFont.category || "Sans"]
            }
            } catch (error) {
              console.error(`Error processing family ${familyName}:`, error)
              return null
            }
          }).filter(Boolean) // Remove null entries
          setFonts(catalogFonts)
          console.log(`📝 Loaded ${catalogFonts.length} font families for catalog (${data.fonts.length} total font files)`)
          
          // Load CSS for all fonts
          loadFontCSS(catalogFonts)
        } else {
          console.warn('No font data or empty fonts array')
        }
      } else {
        console.error('API response not ok:', response.status, response.statusText)
      }
      }
    } catch (error) {
      console.error('Failed to load fonts:', error)
    } finally {
      setIsLoadingFonts(false)
    }
  }, [])

  // Load font CSS dynamically
  const loadFontCSS = useCallback((fonts: FontData[]) => {
    // Remove existing font styles
    const existingStyles = document.querySelectorAll('style[data-font-css]')
    existingStyles.forEach(style => style.remove())

    // Generate CSS for each font - handle multiple files per family
    const fontCSS = fonts.map(font => {
      if (font._familyFonts && font._familyFonts.length > 1) {
        // For families with multiple files, create @font-face for each file
        return font._familyFonts.map((fontFile: any) => {
          const isItalic = fontFile.style?.toLowerCase().includes('italic') || fontFile.style?.toLowerCase().includes('oblique')
          const fontWeight = fontFile.weight || 400
          
          return `
            @font-face {
              font-family: "${font.family}";
              src: url("${fontFile.url || fontFile.blobUrl || `/fonts/${fontFile.filename}`}");
              font-weight: ${fontWeight};
              font-style: ${isItalic ? 'italic' : 'normal'};
              font-display: swap;
            }`
        }).join('\n')
      } else {
        // Single font file
        const isItalic = font.style?.includes('italic') || font.style?.includes('oblique')
        return `
          @font-face {
            font-family: "${font.family}";
            src: url("${font.url || `/fonts/${font.filename}`}");
            font-weight: ${font.availableWeights?.[0] || 400};
            font-style: ${isItalic ? 'italic' : 'normal'};
            font-display: swap;
          }`
      }
    }).join('\n')

    // Inject CSS
    if (fontCSS) {
      const styleElement = document.createElement('style')
      styleElement.setAttribute('data-font-css', 'true')
      styleElement.textContent = fontCSS
      document.head.appendChild(styleElement)
    }
  }, [])

  // Helper function to get stylistic alternates from font's OpenType features
  const getStyleAlternates = (fontId: number) => {
    const font = fonts.find((f) => f.id === fontId)
    if (!font) return []
    
    // Get all OpenType features from multiple sources
    const allFeatures = new Map<string, string>()
    
    // Check main font OpenType features
    if (font.openTypeFeatures && Array.isArray(font.openTypeFeatures)) {
      font.openTypeFeatures.forEach((feature: string) => {
        processStyleFeature(feature, allFeatures)
      })
    }
    
    // Check family fonts if available
    if (font._familyFonts) {
      font._familyFonts.forEach(familyFont => {
        if (familyFont.openTypeFeatures && Array.isArray(familyFont.openTypeFeatures)) {
          familyFont.openTypeFeatures.forEach((feature: string) => {
            processStyleFeature(feature, allFeatures)
          })
        }
      })
    }
    
    return Array.from(allFeatures.entries()).map(([tag, title]) => ({ tag, title })).sort((a, b) => a.tag.localeCompare(b.tag))
  }
  
  // Helper function to process stylistic features
  const processStyleFeature = (feature: string, allFeatures: Map<string, string>) => {
    // Look for stylistic sets (ss01, ss02, etc.) and stylistic alternates
    if (feature.toLowerCase().includes('stylistic set') || 
        feature.toLowerCase().includes('stylistic alternates') ||
        /^ss\d+$/.test(feature.toLowerCase()) ||
        feature.match(/^ss\d+/i)) {
      // Convert readable names to OpenType tags while preserving descriptive names
      let tag = ''
      let title = feature
      
      if (feature.toLowerCase().includes('stylistic set 1')) tag = 'ss01'
      else if (feature.toLowerCase().includes('stylistic set 2')) tag = 'ss02'
      else if (feature.toLowerCase().includes('stylistic set 3')) tag = 'ss03'
      else if (feature.toLowerCase().includes('stylistic set 4')) tag = 'ss04'
      else if (feature.toLowerCase().includes('stylistic set 5')) tag = 'ss05'
      else if (feature.toLowerCase().includes('stylistic set 6')) tag = 'ss06'
      else if (feature.toLowerCase().includes('stylistic set 7')) tag = 'ss07'
      else if (feature.toLowerCase().includes('stylistic set 8')) tag = 'ss08'
      else if (feature.toLowerCase().includes('stylistic set 9')) tag = 'ss09'
      else if (feature.toLowerCase().includes('stylistic set 10')) tag = 'ss10'
      else if (feature.toLowerCase().includes('stylistic alternates')) tag = 'salt'
      else if (/^ss\d+$/i.test(feature)) tag = feature.toLowerCase()
      else if (feature.match(/^ss\d+/i)) {
        // Extract ss01, ss02 etc from start of feature name
        const match = feature.match(/^(ss\d+)/i)
        if (match) tag = match[1].toLowerCase()
      }
      
      if (tag) {
        allFeatures.set(tag, title)
      }
    }
  }

  // Helper function to get other OpenType features (non-stylistic)
  const getOtherOTFeatures = (fontId: number) => {
    const font = fonts.find((f) => f.id === fontId)
    if (!font?._familyFonts) return []
    
    // Mapping from readable feature names to OpenType tags with descriptive titles
    const featureMapping: Record<string, { tag: string; title: string }> = {
      'standard ligatures': { tag: 'liga', title: 'Standard Ligatures' },
      'discretionary ligatures': { tag: 'dlig', title: 'Discretionary Ligatures' },
      'contextual ligatures': { tag: 'clig', title: 'Contextual Ligatures' },
      'kerning': { tag: 'kern', title: 'Kerning' },
      'fractions': { tag: 'frac', title: 'Fractions' },
      'ordinals': { tag: 'ordn', title: 'Ordinals' },
      'superscript': { tag: 'sups', title: 'Superscript' },
      'subscript': { tag: 'subs', title: 'Subscript' },
      'small capitals': { tag: 'smcp', title: 'Small Capitals' },
      'all small caps': { tag: 'c2sc', title: 'All Small Caps' },
      'case-sensitive forms': { tag: 'case', title: 'Case-Sensitive Forms' },
      'slashed zero': { tag: 'zero', title: 'Slashed Zero' },
      'tabular nums': { tag: 'tnum', title: 'Tabular Numbers' },
      'proportional nums': { tag: 'pnum', title: 'Proportional Numbers' },
      'lining figures': { tag: 'lnum', title: 'Lining Figures' },
      'oldstyle figures': { tag: 'onum', title: 'Oldstyle Figures' }
    }
    
    const allFeatures = new Map<string, string>()
    font._familyFonts.forEach(familyFont => {
      if (familyFont.openTypeFeatures) {
        familyFont.openTypeFeatures.forEach((feature: string) => {
          const lowerFeature = feature.toLowerCase()
          // Skip stylistic features (handled separately)
          if (!lowerFeature.includes('stylistic')) {
            const mapping = featureMapping[lowerFeature]
            if (mapping) {
              allFeatures.set(mapping.tag, mapping.title)
            }
          }
        })
      }
    })
    
    return Array.from(allFeatures.entries()).map(([tag, title]) => ({ tag, title })).sort((a, b) => a.tag.localeCompare(b.tag))
  }

  const getVariableAxes = (fontId: number) => {
    const font = fonts.find((f) => f.id === fontId)
    if (!font?._familyFonts) return []
    
    // Get variable axes from font metadata
    const allAxes = new Map()
    font._familyFonts.forEach(familyFont => {
      if (familyFont.variableAxes) {
        familyFont.variableAxes.forEach((axis: any) => {
          // Use axis tag as key to avoid duplicates
          allAxes.set(axis.axis, {
            tag: axis.axis,
            name: axis.name,
            min: axis.min,
            max: axis.max,
            default: axis.default
          })
        })
      }
    })
    
    return Array.from(allAxes.values())
  }

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    )
  }

  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) => (prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]))
  }

  const toggleWeight = (weight: number) => {
    setSelectedWeights((prev) => (prev.includes(weight) ? prev.filter((w) => w !== weight) : [...prev, weight]))
  }

  const updateFontSelection = (fontId: number, weight: number, italic: boolean) => {
    console.log(`Updating font selection for ${fontId}: weight=${weight}, italic=${italic}`);
    setFontWeightSelections((prev) => ({
      ...prev,
      [fontId]: { weight, italic },
    }))
    // Ensure variable fonts reflect dropdown in wght axis for rendering
    setFontVariableAxes((prev) => ({
      ...prev,
      [fontId]: { ...(prev[fontId] || {}), wght: weight },
    }))
  }

  const handleSort = (sortType: "Date" | "Alphabetical") => {
    if (sortBy === sortType) {
      // Toggle direction if same sort type
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      // Set new sort type with default direction
      setSortBy(sortType)
      setSortDirection(sortType === "Date" ? "desc" : "asc") // Date defaults to desc (New), Alphabetical to asc (A-Z)
    }
  }

  const getFilteredFonts = () => {
    const filtered = fonts.filter((font) => {
      // Filter by collection (displayMode) - each tab should only show fonts from that collection
      const fontCollection = font.collection || 'Text' // Default to 'Text' if no collection set
      
      if (fontCollection !== displayMode) {
        return false
      }
      
      // Filter by selected categories (AND logic)
      if (selectedCategories.length > 0) {
        const matchesAllCategories = selectedCategories.every(cat => font.categories.includes(cat))
        if (!matchesAllCategories) return false
      }
      
      // Filter by selected style tags (AND logic)
      if (selectedStyles.length > 0) {
        const hasMatchingStyle = selectedStyles.every(style => {
          // Check styleTags if available
          if (font.styleTags && Array.isArray(font.styleTags)) {
            return font.styleTags.includes(style)
          }
          // Fallback: check against inferred tags
          if (style === 'Display' && font.collection === 'Display') return true
          if (style === 'Serif' && font.categories?.includes('Serif')) return true  
          if (style === 'Sans Serif' && font.categories?.includes('Sans')) return true
          if (style === 'Monospace' && font.categories?.includes('Mono')) return true
          if (style === 'Script' && font.categories?.includes('Script')) return true
          if (style === 'Decorative' && font.categories?.includes('Decorative')) return true
          return false
        })
        if (!hasMatchingStyle) return false
      }
      
      // Filter by selected languages
      if (selectedLanguages.length > 0) {
        const hasMatchingLanguage = selectedLanguages.some(lang => 
          font.languages && font.languages.includes(lang)
        )
        if (!hasMatchingLanguage) return false
      }
      
      // Filter by weights and italic (existing logic)
      if (selectedWeights.length === 0 && !isItalic) return true

      if (selectedWeights.length === 0 && isItalic) {
        return font.hasItalic
      }

      if (selectedWeights.length > 0) {
        const hasSelectedWeight = selectedWeights.some((weight) => font.availableWeights.includes(weight))

        if (isItalic) {
          return hasSelectedWeight && font.hasItalic
        }

        return hasSelectedWeight
      }

      return true
    })

    // Apply sorting based on sortBy and sortDirection
    return filtered.sort((a, b) => {
      let result = 0
      
      if (sortBy === "Alphabetical") {
        // Enhanced alphabetical sorting with numbers and symbols at the top
        result = a.name.localeCompare(b.name, undefined, { 
          numeric: true, 
          sensitivity: 'base',
          ignorePunctuation: false 
        })
      } else {
        // Date sorting - use family representative font's upload date
        const aDate = a._familyFonts?.[0]?.uploadedAt ? new Date(a._familyFonts[0].uploadedAt).getTime() : 0
        const bDate = b._familyFonts?.[0]?.uploadedAt ? new Date(b._familyFonts[0].uploadedAt).getTime() : 0
        result = aDate - bDate // Default ascending (oldest first)
      }
      
      // Apply direction (flip result for descending)
      return sortDirection === "desc" ? -result : result
    })
  }

  const resetFilters = () => {
    setCustomText("")
    setDisplayMode("Text")
    setSelectedPreset("Names")
    setSelectedCategories([])
    setSelectedStyles([])
    setSelectedLanguages([])
    setSelectedWeights([])
    setIsItalic(false)
    setFontWeightSelections({})
    setTextSize([72])
    setLineHeight([120])
    setExpandedCards(new Set())
    setFontOTFeatures({})
    setFontVariableAxes({})
  }

  const getPreviewContent = (fontName: string) => {
    if (customText.trim()) {
      return customText
    }
    return getPresetContent(selectedPreset, fontName)
  }

  // Small wrapper to use ControlledTextPreview with safe focus/cursor handling
  function ControlledPreviewInput({
    value,
    cursorPosition,
    onChangeText,
    className,
    style,
    onToggleExpand,
    fontId,
  }: {
    value: string
    cursorPosition: number
    onChangeText: (v: string, pos: number) => void
    className?: string
    style?: React.CSSProperties
    onToggleExpand?: () => void
    fontId: number
  }) {
    const localRef = useRef<HTMLInputElement | null>(null)
    useEffect(() => { inputRefs.current[fontId] = localRef.current }, [fontId])
    return (
      <ControlledTextPreview
        ref={localRef as any}
        value={value}
        cursorPosition={cursorPosition}
        onChange={(v, pos) => onChangeText(v, pos)}
        onCursorChange={(pos) => onChangeText(value, pos)}
        onFocus={() => setFocusedFontId(fontId)}
        className={className}
        style={style}
        multiline={true}
      />
    )
  }

  // Restore focus to the currently edited preview input after state updates
  useEffect(() => {
    if (focusedFontId != null) {
      const el = inputRefs.current[focusedFontId]
      if (el) {
        try {
          el.focus()
          const pos = Math.min(textCursorPosition, el.value.length)
          el.setSelectionRange(pos, pos)
        } catch {}
      }
    }
  }, [customText, textCursorPosition])

  // Get all available style tags from fonts in current collection only (no inference), ordered by Manage Tags vocab
  const getAvailableStyleTags = () => {
    const allTags = new Set<string>()
    fonts.forEach(font => {
      // Only include tags from fonts in the current collection
      const fontCollection = font.collection || 'Text'
      if (fontCollection === displayMode) {
        if (font.styleTags && Array.isArray(font.styleTags)) {
          font.styleTags.forEach(tag => allTags.add(tag))
        }
      }
    })
    const arr = Array.from(allTags)
    // Sort by per-collection vocab order if available
    // fetch is done outside during lifecycle; try reading window-managed vocab via endpoint synchronously is costly
    // For now, do a quick fetch on first call when no local order yet
    if (typeof window !== 'undefined' && arr.length > 0) {
      // attempt to use cached order via a data attribute or skip if not fetched
    }
    return arr.sort((a,b)=>{
      const order = (window as any).__appearanceOrder__?.[displayMode] as string[] | undefined
      if (order && order.length) {
        const ia = order.findIndex(x=>x.toLowerCase()===a.toLowerCase())
        const ib = order.findIndex(x=>x.toLowerCase()===b.toLowerCase())
        return (ia===-1? 1e6:ia) - (ib===-1? 1e6:ib)
      }
      return a.localeCompare(b)
    })
  }

  // Get dynamic categories based on fonts actually present in current collection, ordered by Manage Tags vocab
  const getCollectionCategories = () => {
    // Get all categories from fonts in the current collection
    const actualCategories = new Set<string>()
    fonts.forEach(font => {
      const fontCollection = font.collection || 'Text'
      if (fontCollection === displayMode && font.categories) {
        font.categories.forEach(category => actualCategories.add(category))
      }
    })
    
    const arr = Array.from(actualCategories)
    return arr.sort((a,b)=>{
      const order = (window as any).__categoryOrder__?.[displayMode] as string[] | undefined
      if (order && order.length) {
        const ia = order.findIndex(x=>x.toLowerCase()===a.toLowerCase())
        const ib = order.findIndex(x=>x.toLowerCase()===b.toLowerCase())
        return (ia===-1? 1e6:ia) - (ib===-1? 1e6:ib)
      }
      return a.localeCompare(b)
    })
  }

  const getCollectionLanguages = () => {
    // Get all languages from fonts in the current collection
    const actualLanguages = new Set<string>()
    fonts.forEach(font => {
      const fontCollection = font.collection || 'Text'
      if (fontCollection === displayMode) {
        // Check if font has language data
        if (font.languages && Array.isArray(font.languages) && font.languages.length > 0) {
          font.languages.forEach(language => actualLanguages.add(language))
        } else {
          // Fallback: if no language data, assume Latin for most fonts
          actualLanguages.add('Latin')
        }
      }
    })
    
    console.log(`Languages in ${displayMode} collection:`, Array.from(actualLanguages));
    
    // Define preferred order for common languages
    const languageOrder = ['Latin', 'Cyrillic', 'Greek', 'Arabic', 'Hebrew', 'Chinese', 'Japanese', 'Korean', 'Thai', 'Vietnamese', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Georgian']
    
    // Return languages in preferred order, but only those that actually exist
    const orderedLanguages = languageOrder.filter(lang => actualLanguages.has(lang))
    
    // Add any remaining languages that exist but aren't in the preferred order
    const remainingLanguages = Array.from(actualLanguages)
      .filter(lang => !languageOrder.includes(lang))
      .sort()
    
    const result = [...orderedLanguages, ...remainingLanguages];
    console.log(`Final language result for ${displayMode}:`, result);
    return result;
  }

  // Helper function to convert weight number to style name
  const getStyleNameFromWeight = (weight: number, isItalic: boolean): string => {
    let styleName = 'Regular'
    
    if (weight <= 150) styleName = 'Thin'
    else if (weight <= 250) styleName = 'ExtraLight'
    else if (weight <= 350) styleName = 'Light'
    else if (weight <= 450) styleName = 'Regular'
    else if (weight <= 550) styleName = 'Medium'
    else if (weight <= 650) styleName = 'SemiBold'
    else if (weight <= 750) styleName = 'Bold'
    else if (weight <= 850) styleName = 'ExtraBold'
    else styleName = 'Black'
    
    return isItalic ? `${styleName} Italic` : styleName
  }

  // Clean up filters when switching collections - remove invalid categories/styles
  const cleanFiltersForCollection = (newDisplayMode: "Text" | "Display" | "Weirdo") => {
    // Temporarily set displayMode to get correct categories/styles for the new collection
    const originalDisplayMode = displayMode
    
    // Get what categories and styles would be available in the new collection
    const newCollectionCategories = new Set<string>()
    const newCollectionStyles = new Set<string>()
    const newCollectionLanguages = new Set<string>()
    
    fonts.forEach(font => {
      const fontCollection = font.collection || 'Text'
      if (fontCollection === newDisplayMode) {
        if (font.categories) {
          font.categories.forEach(category => newCollectionCategories.add(category))
        }
        if (font.styleTags && Array.isArray(font.styleTags)) {
          font.styleTags.forEach(tag => newCollectionStyles.add(tag))
        }
        if (font.languages) {
          font.languages.forEach(language => newCollectionLanguages.add(language))
        }
      }
    })
    
    // Remove selected categories that don't exist in new collection
    const validSelectedCategories = selectedCategories.filter(cat => newCollectionCategories.has(cat))
    if (validSelectedCategories.length !== selectedCategories.length) {
      setSelectedCategories(validSelectedCategories)
    }
    
    // Remove selected styles that don't exist in new collection  
    const validSelectedStyles = selectedStyles.filter(style => newCollectionStyles.has(style))
    if (validSelectedStyles.length !== selectedStyles.length) {
      setSelectedStyles(validSelectedStyles)
    }

    // Remove selected languages that don't exist in new collection
    const validSelectedLanguages = selectedLanguages.filter(lang => newCollectionLanguages.has(lang))
    if (validSelectedLanguages.length !== selectedLanguages.length) {
      setSelectedLanguages(validSelectedLanguages)
    }
  }

  // Post-render font fallback detection using DOM and canvas measurement
  useEffect(() => {
    const detectAndHighlightFallbackChars = () => {
      // Find all contentEditable preview divs
      const previewDivs = document.querySelectorAll('div[contenteditable="true"]')
      
      previewDivs.forEach((div) => {
        const element = div as HTMLElement
        const fontFamily = element.style.fontFamily
        if (!fontFamily) return

        // Create canvas for measurement
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const fontSize = 20 // Match approximate preview size
        const originalText = element.textContent || ''
        
        // Check each character to build fallback map
        const uniqueChars = [...new Set(originalText.split(''))]
        const fallbackChars = new Set<string>()
        
        for (const char of uniqueChars) {
          // Skip basic Latin characters and whitespace
          if (/^[a-zA-Z0-9\s\.,!?;:'"-]$/.test(char)) continue
          
          try {
            // Measure with intended font
            ctx.font = `${fontSize}px ${fontFamily}`
            const intendedWidth = ctx.measureText(char).width
            
            // Measure with fallback only
            ctx.font = `${fontSize}px sans-serif`  
            const fallbackWidth = ctx.measureText(char).width
            
            // If widths are very close, likely using fallback
            if (Math.abs(intendedWidth - fallbackWidth) < 1) {
              fallbackChars.add(char)
            }
          } catch (error) {
            continue
          }
        }
        
        // Only proceed if we have fallback characters
        if (fallbackChars.size === 0) {
          // Clean up any existing highlighting
          element.innerHTML = originalText
          return
        }
        
        // Create highlighted HTML by wrapping fallback characters
        // Use class-only styling to avoid CSS variable injection into text content
        let highlightedHTML = originalText
        
        for (const char of fallbackChars) {
          const escapedChar = char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const regex = new RegExp(escapedChar, 'g')
          highlightedHTML = highlightedHTML.replace(
            regex,
            `<span class="fallback-char">${char}</span>`
          )
        }
        
        // Only update if content actually changed and element is not currently focused
        // Also prevent updates if text already contains HTML/CSS artifacts  
        if (highlightedHTML !== originalText && 
            highlightedHTML !== element.innerHTML && 
            document.activeElement !== element &&
            !originalText.includes('var(--') && 
            !originalText.includes(';">')) {
          element.innerHTML = highlightedHTML
        }
      })
    }
    
    // Run detection after fonts load and on text changes
    const timer = setTimeout(detectAndHighlightFallbackChars, 100)
    return () => clearTimeout(timer)
  }, [fonts, customText])

  // Placeholder function - now handled by useEffect
  const highlightMissingCharacters = (text: string, fontId: number) => {
    return text
  }

  const handlePreviewEdit = (element: HTMLDivElement, newText: string) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      setCustomText(newText)
      return
    }
    
    const range = selection.getRangeAt(0)
    const cursorOffset = range.startOffset

    // Store the cursor position before state update
    const preserveCursor = () => {
      requestAnimationFrame(() => {
        if (element && selection) {
          try {
            let textNode = element.firstChild
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
              const newRange = document.createRange()
              const safeOffset = Math.min(cursorOffset, textNode.textContent?.length || 0)
              newRange.setStart(textNode, safeOffset)
              newRange.setEnd(textNode, safeOffset)
              selection.removeAllRanges()
              selection.addRange(newRange)
            } else {
              // If no text node exists, create one and position cursor
              if (element.textContent !== newText) {
                element.textContent = newText
                textNode = element.firstChild
                if (textNode) {
                  const newRange = document.createRange()
                  const safeOffset = Math.min(cursorOffset, newText.length)
                  newRange.setStart(textNode, safeOffset)
                  newRange.setEnd(textNode, safeOffset)
                  selection.removeAllRanges()
                  selection.addRange(newRange)
                }
              }
            }
          } catch (error) {
            console.warn('Cursor position restoration failed:', error)
            element.focus()
          }
        }
      })
    }

    setCustomText(newText)
    preserveCursor()
  }

  const toggleCardExpansion = (fontId: number) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(fontId)) {
        newSet.delete(fontId)
      } else {
        newSet.add(fontId)
      }
      return newSet
    })
  }

  const toggleOTFeature = (fontId: number, feature: string) => {
    setFontOTFeatures((prev) => ({
      ...prev,
      [fontId]: {
        ...prev[fontId],
        [feature]: !prev[fontId]?.[feature],
      },
    }))
  }

  const updateVariableAxis = (fontId: number, axis: string, value: number) => {
    setFontVariableAxes((prev) => ({
      ...prev,
      [fontId]: {
        ...prev[fontId],
        [axis]: value,
      },
    }))
    
    // Sync weight axis changes with dropdown selection
    if (axis === "wght") {
      setFontWeightSelections((prev) => ({
        ...prev,
        [fontId]: {
          ...(prev[fontId] || { weight: 400, italic: false }),
          weight: Math.round(value), // Round to nearest integer for weight
        },
      }))
    }
  }

  const getEffectiveStyle = (fontId: number) => {
    const font = fonts.find(f => f.id === fontId)
    const fontSelection = fontWeightSelections[fontId] || { weight: 400, italic: false }
    const stateAxes = fontVariableAxes[fontId] || {}
    const otFeatures = fontOTFeatures[fontId] || {}
    const isFamilyVariable = !!(font?.variableAxes && font.variableAxes.length)

    // Base axes: ensure variable fonts always carry an explicit wght so browser doesn't use font's internal default
    const axesOut: Record<string, number> = { ...stateAxes }
    if (isFamilyVariable && axesOut.wght == null) {
      axesOut.wght = selectedWeights.length > 0 ? selectedWeights[0] : (fontSelection.weight || 400)
    }

    // Resolve weight/italic with sidebar filters taking precedence when set
    const weight = selectedWeights.length > 0
      ? selectedWeights[0]
      : (axesOut.wght || fontSelection.weight || 400)
    const italic = isItalic || fontSelection.italic || false

    const result = { weight, italic, variableAxes: axesOut, otFeatures }
    return result
  }

  const getFontFeatureSettings = (otFeatures: Record<string, boolean>) => {
    const activeFeatures = Object.entries(otFeatures)
      .filter(([_, active]) => active)
      .map(([feature, _]) => `"${feature}" 1`)

    if (activeFeatures.length === 0) return undefined
    return activeFeatures.join(", ")
  }

  const getFontVariationSettings = (variableAxes: Record<string, number>) => {
    const axisSettings = Object.entries(variableAxes).map(([axis, value]) => `"${axis}" ${value}`)

    if (axisSettings.length === 0) return undefined
    return axisSettings.join(", ")
  }

  // Load fonts on mount
  useEffect(() => {
    loadFonts()
  }, [loadFonts])

  // Client-side font load verification: sample top families and report
  useEffect(() => {
    const verify = async () => {
      try {
        const sample = fonts.slice(0, 20)
        for (const f of sample) {
          const aliasMatch = /"([^"]+)"/.exec(f.fontFamily)
          const alias = aliasMatch ? aliasMatch[1] : ''
          if (!alias) continue
          // Attempt to load a test string with this font family alias
          const ok = await (document as any).fonts?.load
            ? await (document as any).fonts.load(`16px "${alias}"`).then((res: any) => res && res.length > 0)
            : true
          // Report result to server for diagnostics
          fetch('/api/preview-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alias, family: f.name, ok }),
            keepalive: true,
          }).catch(() => {})
        }
      } catch {}
    }
    if (fonts.length > 0) verify()
  }, [fonts])

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: "var(--gray-surface-prim)" }}>
      {/* Dynamic font loading and fallback character styles */}
      <style dangerouslySetInnerHTML={{ __html: `.fallback-char{opacity:.4!important;color:var(--gray-cont-tert)!important;}` }} />
      {sidebarOpen && (
        <aside
          className="w-[280px] flex-shrink-0 flex flex-col h-full"
          style={{ backgroundColor: "var(--gray-surface-prim)", borderRight: "1px solid var(--gray-brd-prim)" }}
        >
          <div
            className="sticky top-0 z-10 flex justify-between items-center p-4 flex-shrink-0"
            style={{ backgroundColor: "var(--gray-surface-prim)", borderBottom: "1px solid var(--gray-brd-prim)" }}
          >
            <button onClick={() => setSidebarOpen(false)} className="icon-btn">
              <span className="material-symbols-outlined" style={{ fontWeight: 300, fontSize: "20px" }}>
                side_navigation
              </span>
            </button>
            <button onClick={resetFilters} className="icon-btn">
              <span className="material-symbols-outlined" style={{ fontWeight: 300, fontSize: "20px" }}>
                refresh
              </span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="p-6 space-y-8">

              <div>
                <h3 className="text-sidebar-title mb-3">Text presets</h3>
                <div className="flex flex-wrap gap-2">
                  {textPresets.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => {
                        setSelectedPreset(preset)
                        // Set appropriate text size for preset
                        if (preset === "Paragraph") {
                          setTextSize([20])
                        } else {
                          setTextSize([72])
                        }
                        // For "Names" preset, clear customText so each font shows its individual name
                        if (preset === "Names") {
                          setCustomText("")
                        } else {
                          setCustomText(getPresetContent(preset, fonts[0].name))
                        }
                      }}
                      className={`btn-sm ${selectedPreset === preset ? "active" : ""}`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="segmented-control">
                  {(["Text", "Display", "Weirdo"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        // Clean filters before switching collection
                        cleanFiltersForCollection(mode)
                        setDisplayMode(mode)
                        // Scroll to top of the list when switching modes
                        setTimeout(() => {
                          const mainElement = document.querySelector('main')
                          if (mainElement) {
                            mainElement.scrollTo({ top: 0, behavior: 'smooth' })
                          }
                        }, 100)
                      }}
                      className={`segmented-control-button ${displayMode === mode ? "active" : ""}`}
                    >
                      <span
                        className="segmented-control-ag"
                        style={{
                          textAlign: "center",
                          fontFeatureSettings: "'ss03' on, 'cv06' on, 'cv11' on",
                          fontFamily: getStablePreviewFontForCollection(mode),
                          fontSize: "24px",
                          fontStyle: "normal",
                          fontWeight: 500,
                          lineHeight: "24px",
                        }}
                      >
                        Ag
                      </span>
                      <span>{mode}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sidebar-title mb-3">Font categories</h3>
                <div className="flex flex-wrap gap-2">
                  {getCollectionCategories().map((category) => (
                    <button
                      key={category}
                      onClick={() => toggleCategory(category)}
                      className={`btn-sm ${selectedCategories.includes(category) ? "active" : ""}`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sidebar-title mb-3">Appearance</h3>
                <div className="flex flex-wrap gap-2">
                  {getAvailableStyleTags().length > 0 ? getAvailableStyleTags().map((style) => (
                    <button
                      key={style}
                      onClick={() => toggleStyle(style)}
                      className={`btn-sm ${selectedStyles.includes(style) ? "active" : ""}`}
                    >
                      {style}
                    </button>
                  )) : (
                    <span className="text-sm" style={{ color: "var(--gray-cont-tert)" }}>
                      No style tags available
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sidebar-title mb-3">Language support</h3>
                <div className="flex flex-wrap gap-2">
                  {getCollectionLanguages().length > 0 ? getCollectionLanguages().map((language) => (
                    <button
                      key={language}
                      onClick={() =>
                        setSelectedLanguages((prev) =>
                          prev.includes(language) ? prev.filter((l) => l !== language) : [...prev, language],
                        )
                      }
                      className={`btn-sm ${selectedLanguages.includes(language) ? "active" : ""}`}
                    >
                      {language}
                    </button>
                  )) : (
                    <span className="text-sm" style={{ color: "var(--gray-cont-tert)" }}>No languages available in {displayMode} collection</span>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-sidebar-title flex-shrink-0">Text size</h3>
                  <Slider
                    value={textSize}
                    onValueChange={setTextSize}
                    max={200}
                    min={12}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sidebar-title flex-shrink-0" style={{ color: "var(--gray-cont-tert)" }}>
                    {textSize[0]}px
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-sidebar-title flex-shrink-0">Line height</h3>
                  <Slider
                    value={lineHeight}
                    onValueChange={setLineHeight}
                    max={160}
                    min={90}
                    step={10}
                    className="flex-1"
                  />
                  <span className="text-sidebar-title flex-shrink-0" style={{ color: "var(--gray-cont-tert)" }}>
                    {lineHeight[0]}%
                  </span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sidebar-title">Style</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {weights.map((weight) => (
                    <button
                      key={weight}
                      onClick={() => toggleWeight(weight)}
                      className={`btn-sm ${selectedWeights.includes(weight) ? "active" : ""}`}
                    >
                      {weight}
                    </button>
                  ))}
                  <button onClick={() => setIsItalic(!isItalic)} className={`btn-sm ${isItalic ? "active" : ""}`}>
                    Italic
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header
          className="sticky top-0 z-10 p-4 flex-shrink-0"
          style={{ backgroundColor: "var(--gray-surface-prim)", borderBottom: "1px solid var(--gray-brd-prim)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {!sidebarOpen && (
                <div className="w-[32px] h-[32px] flex items-center justify-center">
                  <button onClick={() => setSidebarOpen(true)} className="icon-btn">
                    <span className="material-symbols-outlined" style={{ fontWeight: 300, fontSize: "20px" }}>
                      side_navigation
                    </span>
                  </button>
                </div>
              )}
              <h1 
                className="cursor-pointer hover:opacity-80 transition-opacity"
                style={{
                  fontFeatureSettings: "'ss03' on, 'cv06' on, 'cv11' on",
                  fontFamily: "Inter Variable",
                  fontSize: "22px",
                  fontStyle: "normal",
                  fontWeight: 900,
                  lineHeight: "100%",
                  textTransform: "lowercase",
                  color: "var(--gray-cont-prim)"
                }}
                onClick={() => window.location.href = '/'}
              >
                typedump<sup style={{ fontWeight: 400, fontSize: "12px" }}> β</sup>
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <nav className="flex flex-row gap-2">
                <a href="/" className={`menu-tab ${pathname === "/" ? "active" : ""}`}>Library</a>
                <a href="/about" className={`menu-tab ${pathname === "/about" ? "active" : ""}`}>About</a>
              </nav>
              <a 
                href="mailto:make@logictomagic.com"
                className="icon-btn"
                title="Send feedback"
              >
                <span className="material-symbols-outlined" style={{ fontWeight: 300, fontSize: "20px" }}>
                  flag_2
                </span>
              </a>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-16">
          <div
            className="sticky top-0 z-10 px-4 py-3 flex justify-between items-center"
            style={{ backgroundColor: "var(--gray-surface-prim)", borderBottom: "1px solid var(--gray-brd-prim)" }}
          >
            <span className="text-sidebar-title">{getFilteredFonts().length} font families</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleSort("Date")}
                className={`btn-sm ${sortBy === "Date" ? "active" : ""}`}
              >
                {sortBy === "Date" && sortDirection === "desc" ? "New" : 
                 sortBy === "Date" && sortDirection === "asc" ? "Old" : "New"}
              </button>
              <button
                onClick={() => handleSort("Alphabetical")}
                className={`btn-sm ${sortBy === "Alphabetical" ? "active" : ""}`}
              >
                {sortBy === "Alphabetical" && sortDirection === "asc" ? "A–Z" : 
                 sortBy === "Alphabetical" && sortDirection === "desc" ? "Z–A" : "A–Z"}
              </button>
            </div>
          </div>

          <div className="min-h-[100vh]">
            {isLoadingFonts ? (
              <div className="p-6 text-center">
                <div style={{ color: "var(--gray-cont-tert)" }}>Loading fonts...</div>
              </div>
            ) : fonts.length === 0 ? (
              <div className="p-6 text-center">
                <div style={{ color: "var(--gray-cont-tert)" }}>
                  No fonts uploaded yet. 
                  <a href="/admin-simple" className="text-blue-500 hover:underline ml-1">
                    Upload your first font
                  </a>
                </div>
              </div>
            ) : (
              getFilteredFonts().map((font) => {
              const fontSelection = fontWeightSelections[font.id] || (() => {
                // Use structured style data for default selection
                if (font._availableStyles && font._availableStyles.length > 0) {
                  // Prefer Regular style first, then first non-italic, then first available
                  const regularStyle = font._availableStyles.find(style => 
                    style.styleName === 'Regular' || (style.weight === 400 && !style.isItalic)
                  )
                  const nonItalicStyle = font._availableStyles.find(style => !style.isItalic)
                  const defaultStyle = regularStyle || nonItalicStyle || font._availableStyles[0]
                  
                  return {
                    weight: defaultStyle.weight,
                    italic: defaultStyle.isItalic
                  }
                }
                // Fallback for compatibility
                return { weight: 400, italic: false }
              })()
              const effectiveStyle = getEffectiveStyle(font.id)
              return (
                <div
                  key={font.id}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid var(--gray-brd-prim)" }}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center mb-2 flex-row gap-2">
                          <div
                            className="flex items-center px-2 py-1.5 rounded-md"
                            style={{ border: "1px solid var(--gray-brd-prim)" }}
                          >
                            <h2 className="text-font-name">{font.name}</h2>
                          </div>
                          <div
                            className="dropdown-wrap"
                            data-disabled={font._availableStyles && font._availableStyles.length <= 1 ? "true" : undefined}
                            onClick={() => {
                              const isDisabled = !!(font._availableStyles && font._availableStyles.length <= 1)
                              if (isDisabled) return
                              const el = selectRefs.current[font.id]
                              if (!el) return
                              try {
                                // Prefer native picker when available
                                // @ts-ignore
                                if (typeof el.showPicker === 'function') {
                                  // @ts-ignore
                                  el.showPicker()
                                  return
                                }
                              } catch {}
                              el.focus()
                              // Trigger click in a tick to avoid interfering with native behavior
                              setTimeout(() => el.click(), 0)
                            }}
                          >
                            <select
                              ref={(el) => { selectRefs.current[font.id] = el }}
                              value={`${fontSelection.weight}-${fontSelection.italic}`}
                              onChange={(e) => {
                                const [weight, italic] = e.target.value.split("-")
                                console.log(`Dropdown change for font ${font.id} (${font.name}): ${weight}-${italic}`);
                                updateFontSelection(font.id, Number.parseInt(weight), italic === "true")
                                // Sync variable axis (wght) to reflect dropdown selection
                                setFontVariableAxes(prev => ({
                                  ...prev,
                                  [font.id]: { ...prev[font.id], wght: Number.parseInt(weight) }
                                }))
                              }}
                              disabled={font._availableStyles && font._availableStyles.length <= 1}
                              className={`dropdown-select text-sidebar-title appearance-none ${
                                font._availableStyles && font._availableStyles.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              {font._availableStyles?.map((style, index) => (
                                <option key={`${style.weight}-${style.isItalic}-${index}`} value={`${style.weight}-${style.isItalic}`}>
                                  {style.styleName}
                                </option>
                              ))}
                            </select>
                            {!(font._availableStyles && font._availableStyles.length <= 1) && (
                              <span className="material-symbols-outlined dropdown-icon" style={{ fontWeight: 300, fontSize: "20px" }}>expand_more</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-author">
                            {font.type}, {font.styles} style{font.styles > 1 ? "s" : ""}
                          </span>
                          <span className="text-author">by {font.author}</span>
                        </div>
                      </div>
                      {(() => {
                        // Check if any font in the family has a download link set in admin (not the blob URL)
                        const adminDownloadLink = font.downloadLink || font._familyFonts?.find(f => f.downloadLink && f.downloadLink.trim() !== '')?.downloadLink
                        const hasAdminDownloadLink = Boolean(adminDownloadLink)
                        
                        if (hasAdminDownloadLink) {
                          return (
                            <button
                              className="download-btn"
                              style={{
                                color: "#fcfcfc",
                                backgroundColor: "#0a0a0a",
                              }}
                              onClick={() => window.open(adminDownloadLink, '_blank')}
                            >
                              Download
                            </button>
                          )
                        }
                        return null // Hide button if no admin download link is set
                      })()}
                    </div>
                    <ControlledPreviewInput
                      value={getPreviewContent(font.name)}
                      onChangeText={(val, pos) => {
                        // Only set global customText when user actually changes text
                        // Avoid setting it on focus/cursor events that pass the same value
                        setTextCursorPosition(pos)
                        if (val !== customText) {
                          // If preset is in effect (customText empty) and val equals preset content, skip
                          const presetValue = getPresetContent(selectedPreset, font.name)
                          const isPreset = customText.trim() === '' && val === presetValue
                          if (!isPreset) setCustomText(val)
                        }
                      }}
                      cursorPosition={textCursorPosition}
                      className="whitespace-pre-line break-words cursor-text focus:outline-none w-full bg-transparent border-0"
                      style={{
                        fontSize: `${textSize[0]}px`,
                        lineHeight: `${lineHeight[0]}%`,
                        fontFamily: font.fontFamily,
                        fontWeight: effectiveStyle.weight,
                        fontStyle: effectiveStyle.italic ? "italic" : "normal",
                        color: "var(--gray-cont-prim)",
                        fontFeatureSettings: getFontFeatureSettings(effectiveStyle.otFeatures || {}),
                        fontVariationSettings: getFontVariationSettings(effectiveStyle.variableAxes || {}),
                      }}
                      onToggleExpand={() => toggleCardExpansion(font.id)}
                      fontId={font.id}
                    />

                    {expandedCards.has(font.id) && (
                      <div className="mt-6 space-y-4 pt-4" style={{ borderTop: "1px solid var(--gray-brd-prim)" }}>
                        {/* Style Alternates */}
                        {getStyleAlternates(font.id).length > 0 && (
                          <div>
                            <div className="text-sidebar-title mb-2" style={{ color: "var(--gray-cont-tert)" }}>
                              Stylistic Alternates
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {getStyleAlternates(font.id).map((feature) => (
                                <button
                                  key={feature.tag}
                                  onClick={() => toggleOTFeature(font.id, feature.tag)}
                                  className={`btn-sm ${fontOTFeatures[font.id]?.[feature.tag] ? "active" : ""}`}
                                  title={feature.title}
                                >
                                  {feature.title}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Other OpenType Features */}
                        {getOtherOTFeatures(font.id).length > 0 && (
                          <div>
                            <div className="text-sidebar-title mb-2" style={{ color: "var(--gray-cont-tert)" }}>
                              OpenType Features
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {getOtherOTFeatures(font.id).map((feature) => (
                                <button
                                  key={feature.tag}
                                  onClick={() => toggleOTFeature(font.id, feature.tag)}
                                  className={`btn-sm ${fontOTFeatures[font.id]?.[feature.tag] ? "active" : ""}`}
                                  title={feature.title}
                                >
                                  {feature.title}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Variable Font Axes */}
                        {getVariableAxes(font.id).length > 0 && (
                          <div>
                            <div className="text-sidebar-title mb-2" style={{ color: "var(--gray-cont-tert)" }}>
                              Variable Axes
                            </div>
                            <div className="w-full max-w-[280px]">
                              {getVariableAxes(font.id).map((axis) => {
                                // Get initial value from current font characteristics
                                const getInitialValue = () => {
                                  if (axis.tag === "wght" && effectiveStyle.weight) {
                                    // Clamp weight to axis bounds
                                    return Math.max(axis.min, Math.min(axis.max, effectiveStyle.weight))
                                  }
                                  return fontVariableAxes[font.id]?.[axis.tag] || axis.default
                                }
                                
                                return (
                                  <div key={axis.tag} className="mb-3 last:mb-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sidebar-title flex-shrink-0 w-16">{axis.name}</span>
                                      <Slider
                                        value={[getInitialValue()]}
                                        onValueChange={(value) => updateVariableAxis(font.id, axis.tag, value[0])}
                                        min={axis.min}
                                        max={axis.max}
                                        step={axis.tag === "wght" ? 1 : 0.1}
                                        className="flex-1"
                                      />
                                      <span
                                        className="text-sidebar-title flex-shrink-0 w-12 text-right"
                                        style={{ color: "var(--gray-cont-tert)" }}
                                      >
                                        {Math.round((fontVariableAxes[font.id]?.[axis.tag] || getInitialValue()) * 10) / 10}
                                      </span>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
            )}
            
            {/* Footer at end of catalog (styled like About) */}
            <footer 
              style={{ 
                display: "flex",
                padding: "24px",
                flexDirection: "column",
                alignItems: "flex-start",
                alignSelf: "stretch",
                borderTop: "1px solid var(--gray-brd-prim)" 
              }}
            >
              <div className="flex justify-between items-center w-full">
                <span className="text-sm" style={{ color: "var(--gray-cont-tert)" }}>
                  © Baseline, 2025
                </span>
                <span className="text-sm" style={{ color: "var(--gray-cont-tert)", textAlign: "right" }}>
                  Made by <a href="https://magicxlogic.com/" target="_blank" rel="noopener noreferrer" className="hover:underline">Magic x Logic</a>
                </span>
              </div>
            </footer>
          </div>
        </main>

      </div>
    </div>
  )
}
