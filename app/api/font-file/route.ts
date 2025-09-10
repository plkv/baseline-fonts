import { NextRequest } from 'next/server'

function contentTypeFromExt(url: string): string {
  const u = url.toLowerCase()
  if (u.endsWith('.woff2')) return 'font/woff2'
  if (u.endsWith('.woff')) return 'font/woff'
  if (u.endsWith('.otf')) return 'font/otf'
  if (u.endsWith('.ttf')) return 'font/ttf'
  return 'application/octet-stream'
}

export async function GET(req: NextRequest) {
  try {
    const u = req.nextUrl.searchParams.get('u')
    if (!u) return new Response('missing url', { status: 400 })
    const url = Buffer.from(u, 'base64url').toString('utf8')

    const resp = await fetch(url, { cache: 'force-cache' })
    if (!resp.ok || !resp.body) {
      return new Response('upstream error', { status: 502 })
    }
    const ct = resp.headers.get('content-type') || contentTypeFromExt(url)
    const etag = resp.headers.get('etag') || undefined
    const cc = resp.headers.get('cache-control') || 'public, max-age=31536000, immutable'

    return new Response(resp.body, {
      status: 200,
      headers: {
        'Content-Type': ct,
        'Cache-Control': cc,
        ...(etag ? { ETag: etag } : {}),
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    })
  } catch (e) {
    console.error('font-file proxy error', e)
    return new Response('proxy error', { status: 500 })
  }
}

