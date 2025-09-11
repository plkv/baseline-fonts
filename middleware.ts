import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  // Block legacy writes only: match /api/fonts or /api/fonts/*, not /api/fonts-clean
  if (/^\/api\/fonts(?:\/|$)/.test(pathname)) {
    const method = req.method.toUpperCase()
    if (method !== 'GET' && method !== 'HEAD') {
      return new NextResponse(JSON.stringify({ error: 'Legacy API is read-only. Use /api/fonts-clean.' }), {
        status: 410,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*']
}
