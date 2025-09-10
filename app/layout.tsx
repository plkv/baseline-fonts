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
  title: "typedump",
  description: "Preselected free font collections curated by pro community",
  generator: 'v0.app',
  metadataBase: new URL('https://baseline-fonts.vercel.app'),
  openGraph: {
    title: "typedump",
    description: "Preselected free font collections curated by pro community",
    url: "https://baseline-fonts.vercel.app",
    siteName: "typedump",
    images: [
      {
        url: "/og-image.webp",
        width: 1200,
        height: 630,
        alt: "typedump - Preselected free font collections",
        type: "image/webp",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "typedump",
    description: "Preselected free font collections curated by pro community",
    images: ["/og-image.webp"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon-light.png", media: "(prefers-color-scheme: light)" },
      { url: "/favicon-dark.png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/apple-touch-icon.png",
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
        <link rel="preconnect" href="https://blob.vercel-storage.com" crossOrigin="" />
        <link rel="dns-prefetch" href="//blob.vercel-storage.com" />
        <link rel="dns-prefetch" href="//vercel-storage.com" />
        <link rel="stylesheet" href="/api/font-css" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300,0,0"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
