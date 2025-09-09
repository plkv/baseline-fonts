/**
 * Unicode-Aware Symbol Detector
 * Replaces unreliable canvas-based font measurement
 */

export class SymbolDetector {
  private static instance: SymbolDetector
  private testElement: HTMLSpanElement | null = null
  
  static getInstance(): SymbolDetector {
    if (!SymbolDetector.instance) {
      SymbolDetector.instance = new SymbolDetector()
    }
    return SymbolDetector.instance
  }
  
  private getTestElement(): HTMLSpanElement {
    if (!this.testElement) {
      this.testElement = document.createElement('span')
      this.testElement.style.cssText = `
        position: absolute;
        visibility: hidden;
        white-space: nowrap;
        font-size: 16px;
        left: -9999px;
        top: -9999px;
        pointer-events: none;
      `
      document.body.appendChild(this.testElement)
    }
    return this.testElement
  }
  
  /**
   * Check if a specific character is supported by the font
   * Uses CSS font-family cascade to detect fallback usage
   */
  private fontSupportsChar(char: string, fontFamily: string): boolean {
    const element = this.getTestElement()
    
    // Test with the specific font
    element.style.fontFamily = fontFamily
    element.textContent = char
    
    // Check if browser applied a fallback font
    const computedStyle = window.getComputedStyle(element)
    const actualFontFamily = computedStyle.fontFamily
    
    // Extract the first font name from the family string
    const primaryFont = fontFamily.split(',')[0].replace(/['"]/g, '').trim()
    
    // If the computed font family still contains our primary font, it's supported
    return actualFontFamily.toLowerCase().includes(primaryFont.toLowerCase())
  }
  
  /**
   * Advanced character support detection using Unicode properties
   */
  private isLikelySupported(char: string, fontFamily: string): boolean {
    const codePoint = char.codePointAt(0)
    if (!codePoint) return false
    
    // Basic Latin is almost always supported
    if (codePoint >= 0x0020 && codePoint <= 0x007F) {
      return true
    }
    
    // Latin Extended is commonly supported
    if (codePoint >= 0x00A0 && codePoint <= 0x017F) {
      return this.fontSupportsChar(char, fontFamily)
    }
    
    // Use direct font support test for other ranges
    return this.fontSupportsChar(char, fontFamily)
  }
  
  /**
   * Detect characters that will use fallback fonts
   */
  detectFallbackChars(text: string, fontFamily: string): Set<string> {
    const fallbackChars = new Set<string>()
    
    // Get unique characters, excluding basic ASCII
    const chars = [...new Set([...text])]
      .filter(char => {
        const codePoint = char.codePointAt(0)
        // Skip basic ASCII characters (space through DEL)
        return codePoint && (codePoint < 32 || codePoint > 126)
      })
    
    // Test each character
    for (const char of chars) {
      if (!this.isLikelySupported(char, fontFamily)) {
        fallbackChars.add(char)
      }
    }
    
    return fallbackChars
  }
  
  /**
   * Get comprehensive character support info
   */
  analyzeTextSupport(text: string, fontFamily: string): {
    totalChars: number
    supportedChars: number
    fallbackChars: Set<string>
    supportPercentage: number
  } {
    const uniqueChars = [...new Set([...text])]
    const fallbackChars = this.detectFallbackChars(text, fontFamily)
    const supportedChars = uniqueChars.length - fallbackChars.size
    
    return {
      totalChars: uniqueChars.length,
      supportedChars,
      fallbackChars,
      supportPercentage: uniqueChars.length > 0 
        ? Math.round((supportedChars / uniqueChars.length) * 100)
        : 100
    }
  }
  
  /**
   * Apply fallback highlighting to text elements
   * Returns HTML with fallback characters wrapped in spans
   */
  highlightFallbackChars(text: string, fontFamily: string, className = 'fallback-char'): string {
    const fallbackChars = this.detectFallbackChars(text, fontFamily)
    
    if (fallbackChars.size === 0) {
      return text
    }
    
    let highlightedText = text
    
    // Sort by length (longest first) to avoid nested replacements
    const sortedFallbacks = Array.from(fallbackChars)
      .sort((a, b) => b.length - a.length)
    
    for (const char of sortedFallbacks) {
      const escapedChar = char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(escapedChar, 'g')
      highlightedText = highlightedText.replace(
        regex,
        `<span class="${className}">${char}</span>`
      )
    }
    
    return highlightedText
  }
  
  /**
   * Check if a font likely supports a specific language/script
   */
  supportsLanguage(fontFamily: string, language: string): boolean {
    // Sample characters for different languages/scripts
    const languageSamples: Record<string, string> = {
      'latin': 'AÄÖÜáéíóúñç',
      'cyrillic': 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя',
      'greek': 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω',
      'hebrew': 'אבגדהוזחטיכלמנסעפצקרשת',
      'arabic': 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي',
      'chinese': '中文汉字',
      'japanese': 'ひらがなカタカナ漢字',
      'korean': '한글조선글',
      'thai': 'ไทยภาษา',
      'devanagari': 'देवनागरी',
      'emoji': '😀😃😄😁😆😅🤣😂🙂🙃😉😊😇'
    }
    
    const sample = languageSamples[language.toLowerCase()]
    if (!sample) return false
    
    // Test a few characters from the sample
    const testChars = [...sample].slice(0, 3)
    const supportedCount = testChars.filter(char => 
      this.isLikelySupported(char, fontFamily)
    ).length
    
    // Require at least 50% support
    return supportedCount / testChars.length >= 0.5
  }
  
  /**
   * Cleanup when done
   */
  destroy() {
    if (this.testElement) {
      document.body.removeChild(this.testElement)
      this.testElement = null
    }
  }
}

// Export singleton instance
export const symbolDetector = SymbolDetector.getInstance()

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    symbolDetector.destroy()
  })
}