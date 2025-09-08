import type React from "react"
import type { Metadata } from "next"
import { Inter, Space_Grotesk, Space_Mono } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
})

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Baseline Fonts",
  description: "A curated collection of high-quality typefaces for modern design",
  generator: 'v0.app',
  openGraph: {
    title: "Baseline Fonts",
    description: "A curated collection of high-quality typefaces for modern design",
    url: "https://baseline-fonts.vercel.app",
    siteName: "Baseline Fonts",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Baseline Fonts - Typography Collection",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Baseline Fonts",
    description: "A curated collection of high-quality typefaces for modern design",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      {
        url: "/favicon-light.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/favicon-dark.png", 
        media: "(prefers-color-scheme: dark)",
      },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${spaceMono.variable}`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300,0,0"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
