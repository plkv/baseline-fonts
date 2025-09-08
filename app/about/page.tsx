"use client"

import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"

export default function AboutPage() {
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })
  
  // Handle resize events
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: "var(--gray-surface-prim)" }}>
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header
          className="sticky top-0 z-10 p-4 flex-shrink-0"
          style={{ backgroundColor: "var(--gray-surface-prim)", borderBottom: "1px solid var(--gray-brd-prim)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
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

        <main className="flex-1 overflow-y-auto">
          <div 
            className="p-6"
            style={{ 
              maxWidth: "800px",
              color: "var(--gray-cont-prim)",
              fontFeatureSettings: "'ss03' on, 'cv06' on, 'cv11' on",
              fontFamily: "Inter Variable",
              fontSize: "28px",
              fontStyle: "normal",
              fontWeight: 400,
              lineHeight: "130%",
              textAlign: "left"
            }}
          >
              <p className="mb-4">
                Every designer knows this particular circle of hell: you need beautiful free fonts for commercial use but the budget is nonexistent. So begins the descent through Google Fonts purgatory, where another font's kerning gaps could drive a truck through and hours vanish into rabbit holes of mediocrity while searching for quality typography.
              </p>
              <p className="mb-4">
                Yet somewhere in the digital wilderness, brilliant typographers quietly release exceptional work, scattered across Behance portfolios and design communities. Finding these free fonts for designers requires the persistence of an archaeologist and the connections of a well-traveled insider.
              </p>
              <p className="mb-4">
                We exist in that gap. Our team and related community hunts through the typographic wilderness so you don't have to, testing every curve and cursing every broken accent mark before anything reaches your screen. These are the best free fonts that won't make you wince six months later.
              </p>
              <p className="mb-4">
                This began as an internal obsession at Magic X Logic. After years of vetting fonts for client work, we'd accidentally created what we called our "typedump"—quality typefaces that could hold their own professionally without the professional price tag. The name stuck, and what started as solving our own problem became typedump: a curated gallery where every typeface earns its place through merit, not volume.
              </p>
              <p className="mb-4">
                Behind every font in our collection is a designer who chose to share their craft with the world. Some are established foundries testing new ideas, others are students pushing boundaries, many are generous souls who believe good typography shouldn't be gatekept by budgets. Their work deserves better than drowning in seas of mediocrity on sites that prioritize quantity over curation.
              </p>
              <p className="mb-4">
                We've organized our finds into three collections: Text for interfaces and body copy that disappears into readability, Display for headlines that demand attention, and Weirdo for those moments when your project calls for something delightfully unhinged.
              </p>
              <p>
                If you've stumbled across a typographic gem we've somehow missed, or if you have thoughts on how we could do this whole thing better, we'd love to hear from you at <a href="mailto:make@magicxlogic.com" className="hover:underline" style={{ color: "var(--gray-cont-prim)" }}>make@magicxlogic.com</a>. The hunt never really ends.
              </p>
          </div>

          <footer 
            style={{ 
              display: "flex",
              padding: "24px",
              flexDirection: "column",
              alignItems: "flex-start",
              alignSelf: "stretch",
              borderTop: "1px solid var(--gray-brd-prim)",
              margin: 0
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
        </main>
      </div>
    </div>
  )
}

