/**
 * SEO-friendly font descriptions
 * Format: { fontName: { description, keywords, useCases } }
 */

export interface FontDescription {
  description: string
  keywords: string[]
  useCases: string[]
  mood?: string
}

export const fontDescriptions: Record<string, FontDescription> = {
  // Popular Sans-Serif Fonts
  "Inter": {
    description: "Modern geometric sans-serif designed specifically for digital interfaces and screen readability. Features a tall x-height and open apertures for excellent legibility at all sizes.",
    keywords: ["geometric", "interface", "modern", "clean", "neutral"],
    useCases: ["UI/UX design", "web applications", "mobile apps", "dashboards", "documentation"],
    mood: "Professional, Modern, Neutral"
  },

  "Roboto": {
    description: "Geometric grotesque font with mechanical skeleton and friendly curves. Default font for Android OS, optimized for cross-platform use and high legibility.",
    keywords: ["geometric", "grotesque", "android", "system", "versatile"],
    useCases: ["mobile apps", "web interfaces", "body text", "headers", "branding"],
    mood: "Friendly, Modern, Approachable"
  },

  "Open Sans": {
    description: "Humanist sans-serif with upright stress and open forms. Designed for print, web, and mobile with excellent readability in small sizes.",
    keywords: ["humanist", "neutral", "readable", "friendly", "open"],
    useCases: ["body text", "websites", "print materials", "presentations", "documentation"],
    mood: "Neutral, Friendly, Professional"
  },

  "Montserrat": {
    description: "Geometric typeface inspired by old posters and signs from Montserrat neighborhood in Buenos Aires. Modern interpretation of urban typography with strong character.",
    keywords: ["geometric", "bold", "urban", "modern", "display"],
    useCases: ["headlines", "logos", "posters", "branding", "titles"],
    mood: "Bold, Urban, Confident"
  },

  "Poppins": {
    description: "Geometric sans supporting Devanagari and Latin scripts. Clean, rounded letterforms with international appeal and excellent readability.",
    keywords: ["geometric", "rounded", "international", "modern", "clean"],
    useCases: ["headings", "branding", "UI elements", "mobile apps", "websites"],
    mood: "Friendly, Modern, International"
  },

  "Lato": {
    description: "Humanist sans-serif designed to convey stability and seriousness while maintaining friendly warmth. Semi-rounded details provide unique personality.",
    keywords: ["humanist", "warm", "stable", "friendly", "corporate"],
    useCases: ["corporate identity", "body text", "presentations", "web content", "print"],
    mood: "Warm, Professional, Reliable"
  },

  "Raleway": {
    description: "Elegant sans-serif family with thin weights perfect for elegant headers. Features unique 'w' and distinctive personality in display sizes.",
    keywords: ["elegant", "thin", "display", "refined", "sophisticated"],
    useCases: ["headers", "luxury branding", "fashion", "portfolios", "editorial"],
    mood: "Elegant, Sophisticated, Refined"
  },

  "Nunito": {
    description: "Rounded sans-serif with soft curves and balanced proportions. Friendly appearance makes it perfect for products and services targeting families and children.",
    keywords: ["rounded", "friendly", "soft", "approachable", "playful"],
    useCases: ["children's products", "education", "friendly brands", "UI design", "mobile apps"],
    mood: "Friendly, Soft, Approachable"
  },

  // Serif Fonts
  "Merriweather": {
    description: "Traditional serif designed for readability on screens. Strong serifs and generous x-height optimize it for reading on digital displays.",
    keywords: ["serif", "traditional", "readable", "editorial", "book"],
    useCases: ["long-form reading", "blogs", "articles", "ebooks", "editorial"],
    mood: "Traditional, Readable, Authoritative"
  },

  "Playfair Display": {
    description: "High-contrast serif with thick-thin stroke patterns inspired by 18th century design. Elegant and dramatic for headlines and titles.",
    keywords: ["high-contrast", "elegant", "dramatic", "classic", "refined"],
    useCases: ["magazine headlines", "luxury branding", "fashion", "invitations", "editorial"],
    mood: "Elegant, Dramatic, Luxurious"
  },

  "Lora": {
    description: "Contemporary serif with calligraphic roots and moderate contrast. Brushed curves provide distinction while maintaining readability for body text.",
    keywords: ["calligraphic", "contemporary", "readable", "elegant", "moderate"],
    useCases: ["body text", "magazines", "blogs", "books", "editorial content"],
    mood: "Elegant, Contemporary, Readable"
  },

  "Crimson Text": {
    description: "Old-style serif inspired by classic book typefaces. Designed for comfortable reading in long-form text on screen and print.",
    keywords: ["old-style", "book", "classic", "readable", "traditional"],
    useCases: ["books", "long articles", "academic papers", "novels", "editorial"],
    mood: "Classic, Traditional, Scholarly"
  },

  // Display & Decorative Fonts
  "Bebas Neue": {
    description: "Tall, condensed sans-serif with strong vertical emphasis. All-caps display font perfect for headlines and impactful statements.",
    keywords: ["condensed", "bold", "impact", "headline", "strong"],
    useCases: ["headlines", "posters", "logos", "banners", "athletic branding"],
    mood: "Strong, Bold, Impactful"
  },

  "Pacifico": {
    description: "Brush script inspired by 1950s American surf culture. Casual and friendly letterforms evoke beachside nostalgia and laid-back lifestyle.",
    keywords: ["script", "casual", "retro", "surf", "friendly"],
    useCases: ["logos", "branding", "packaging", "casual products", "lifestyle brands"],
    mood: "Casual, Retro, Friendly"
  },

  "Abril Fatface": {
    description: "Heavy display serif inspired by advertising posters from 19th century Britain and France. Extreme contrast creates dramatic impact.",
    keywords: ["display", "high-contrast", "dramatic", "vintage", "bold"],
    useCases: ["headlines", "posters", "magazine covers", "branding", "titles"],
    mood: "Dramatic, Vintage, Bold"
  },

  "Lobster": {
    description: "Bold script with thick-thin transitions and Dutch heritage. Retro style perfect for branding seeking vintage charm with modern twist.",
    keywords: ["script", "bold", "retro", "friendly", "vintage"],
    useCases: ["logos", "signage", "packaging", "restaurant branding", "casual products"],
    mood: "Retro, Friendly, Bold"
  },

  // Monospace Fonts
  "Fira Code": {
    description: "Monospaced font designed for coding with programming ligatures. Combines best features of Fira Mono with special symbols for code.",
    keywords: ["monospace", "coding", "ligatures", "programming", "technical"],
    useCases: ["code editors", "programming", "terminal", "documentation", "technical writing"],
    mood: "Technical, Modern, Precise"
  },

  "JetBrains Mono": {
    description: "Modern monospace designed for developers. Increased height for better code readability and special attention to problematic character pairs.",
    keywords: ["monospace", "coding", "developer", "readable", "modern"],
    useCases: ["code editors", "IDEs", "programming", "terminal", "technical docs"],
    mood: "Modern, Technical, Clear"
  },

  "Source Code Pro": {
    description: "Monospaced font family designed for coding environments. Clear distinction between similar characters and optimized metrics for code.",
    keywords: ["monospace", "coding", "clear", "professional", "readable"],
    useCases: ["code editors", "programming", "terminal", "documentation", "CLI tools"],
    mood: "Professional, Clear, Technical"
  },

  // Default fallback for fonts without specific descriptions
  "_default": {
    description: "Professional typeface suitable for a variety of design projects. Carefully selected for quality and versatility.",
    keywords: ["versatile", "professional", "quality", "design"],
    useCases: ["web design", "print", "branding", "digital products"],
    mood: "Professional, Versatile"
  }
}

/**
 * Get description for a font by name
 * Returns default description if specific one not found
 */
export function getFontDescription(fontName: string): FontDescription {
  // Try exact match first
  if (fontDescriptions[fontName]) {
    return fontDescriptions[fontName]
  }

  // Try partial match (in case of family variations like "Inter Variable")
  const partialMatch = Object.keys(fontDescriptions).find(key =>
    fontName.includes(key) || key.includes(fontName)
  )

  if (partialMatch) {
    return fontDescriptions[partialMatch]
  }

  // Return default
  return fontDescriptions._default
}

/**
 * Generate SEO-friendly description text for a font
 */
export function generateFontSEOText(fontName: string, fontData?: any): string {
  const desc = getFontDescription(fontName)
  const parts: string[] = []

  // Main description
  parts.push(desc.description)

  // Add technical details if available
  if (fontData) {
    if (fontData.type === 'Variable') {
      parts.push(`This variable font offers dynamic weight adjustment for responsive design.`)
    }
    if (fontData.styles && fontData.styles > 1) {
      parts.push(`Available in ${fontData.styles} styles.`)
    }
    if (fontData.languages && fontData.languages.length > 0) {
      const langs = fontData.languages.slice(0, 3).join(', ')
      parts.push(`Supports ${langs}${fontData.languages.length > 3 ? ' and more' : ''}.`)
    }
  }

  // Add use cases
  if (desc.useCases.length > 0) {
    parts.push(`Perfect for: ${desc.useCases.slice(0, 3).join(', ')}.`)
  }

  return parts.join(' ')
}
