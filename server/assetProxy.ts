/**
 * Same-origin CORS shim for remote assets.
 *
 * The exporter can only bake an image into the output if it can *read* the
 * bytes, and `fetch()` from the page is blocked whenever the origin hosting
 * the image doesn't send `Access-Control-Allow-Origin` (which most sites,
 * including plain CDNs and Odoo/`/web/image` endpoints, do not). Drawing the
 * image to a canvas instead taints it, so `toDataURL()`/`toBlob()` throw.
 *
 * This handler re-fetches the asset server-side and re-serves it from our own
 * origin with permissive CORS, which makes it readable again. It is shared
 * verbatim by the Cloudflare Worker (production) and the Vite dev/preview
 * middleware, so both environments enforce the same limits.
 *
 * Written against Web-standard `Request`/`Response`/`fetch` only — no
 * Node- or Worker-specific APIs.
 */

export const ASSET_PROXY_PATH = '/api/proxy'

/** Hard ceiling on a proxied asset, to keep one URL from exhausting memory. */
const MAX_BYTES = 12 * 1024 * 1024

const FETCH_TIMEOUT_MS = 15_000

const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,HEAD,OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
}

function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json; charset=utf-8' },
  })
}

function ipv4ToInt(host: string): number | null {
  const parts = host.split('.')
  if (parts.length !== 4) return null
  let value = 0
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null
    const octet = Number(part)
    if (octet > 255) return null
    value = value * 256 + octet
  }
  return value
}

function isPrivateIpv4(host: string): boolean {
  const ip = ipv4ToInt(host)
  if (ip === null) return false
  const inRange = (cidr: string, bits: number) => {
    const base = ipv4ToInt(cidr)
    if (base === null) return false
    const mask = bits === 0 ? 0 : (-1 << (32 - bits)) >>> 0
    return (ip & mask) >>> 0 === (base & mask) >>> 0
  }
  return (
    inRange('0.0.0.0', 8) || // "this" network
    inRange('10.0.0.0', 8) || // private
    inRange('100.64.0.0', 10) || // carrier-grade NAT
    inRange('127.0.0.0', 8) || // loopback
    inRange('169.254.0.0', 16) || // link-local (incl. cloud metadata)
    inRange('172.16.0.0', 12) || // private
    inRange('192.0.0.0', 24) || // IETF protocol assignments
    inRange('192.168.0.0', 16) || // private
    inRange('198.18.0.0', 15) || // benchmarking
    inRange('224.0.0.0', 4) || // multicast
    inRange('240.0.0.0', 4) // reserved
  )
}

/**
 * Blocks the obvious SSRF targets: loopback, link-local (cloud metadata
 * endpoints live at 169.254.169.254), private LAN ranges and internal-only
 * TLDs. This is a best-effort textual check — it can't resolve a public
 * hostname that points at a private address — but the production deployment
 * runs on Cloudflare's edge, from which private ranges aren't routable anyway.
 */
function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|]$/g, '')
  if (!host) return true
  if (host === 'localhost' || host.endsWith('.localhost')) return true
  if (host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.home.arpa')) return true
  if (host === '::' || host === '::1') return true
  // IPv4-mapped IPv6 (::ffff:127.0.0.1) collapses to its embedded v4 address.
  const mapped = /^::ffff:(.+)$/.exec(host)
  if (mapped) return isBlockedHost(mapped[1])
  if (/^f[cd][0-9a-f]{2}:/.test(host)) return true // unique local fc00::/7
  if (/^fe[89ab][0-9a-f]:/.test(host)) return true // link-local fe80::/10
  return isPrivateIpv4(host)
}

const MAGIC_BYTES: { type: string; test: (bytes: Uint8Array) => boolean }[] = [
  { type: 'image/png', test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { type: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: 'image/gif', test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 },
  {
    type: 'image/webp',
    test: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45,
  },
  { type: 'image/bmp', test: (b) => b[0] === 0x42 && b[1] === 0x4d },
  { type: 'image/x-icon', test: (b) => b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 && b[3] === 0x00 },
]

/**
 * Servers routinely mislabel images as `application/octet-stream` (or send no
 * type at all), which would make the resulting data URL undecodable as an
 * image. Sniffing the magic bytes recovers the real type; anything we can't
 * identify as an image or font is rejected rather than proxied blindly.
 */
function resolveContentType(declared: string | null, bytes: Uint8Array): string | null {
  const type = (declared ?? '').split(';')[0].trim().toLowerCase()
  if (type.startsWith('image/') || type.startsWith('font/')) return type
  if (type === 'application/font-woff' || type === 'application/font-woff2' || type === 'application/x-font-ttf') {
    return type
  }
  for (const { type: sniffed, test } of MAGIC_BYTES) {
    if (bytes.length >= 12 && test(bytes)) return sniffed
  }
  // SVG arrives as text; sniff its root element rather than trusting the type.
  const head = new TextDecoder().decode(bytes.slice(0, 256)).trimStart()
  if (head.startsWith('<svg') || head.startsWith('<?xml')) return 'image/svg+xml'
  return null
}

/** Reads the body while enforcing {@link MAX_BYTES}, so an oversized (or chunked, unlabelled) response can't be buffered whole. */
async function readCapped(response: Response): Promise<Uint8Array | null> {
  const declaredLength = Number(response.headers.get('content-length') ?? NaN)
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BYTES) return null

  const reader = response.body?.getReader()
  if (!reader) return new Uint8Array(0)

  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    total += value.byteLength
    if (total > MAX_BYTES) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }

  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out
}

/**
 * Fetches `rawUrl` server-side and returns it with CORS headers attached.
 * Never throws — every failure comes back as a JSON error response so the
 * client can fall back to its next strategy.
 */
export async function proxyAsset(rawUrl: string | null): Promise<Response> {
  if (!rawUrl) return errorResponse(400, 'Missing "url" query parameter.')

  let target: URL
  try {
    target = new URL(rawUrl)
  } catch {
    return errorResponse(400, 'The "url" parameter is not a valid absolute URL.')
  }

  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return errorResponse(400, 'Only http and https URLs can be proxied.')
  }
  if (isBlockedHost(target.hostname)) {
    return errorResponse(403, 'That host is not allowed.')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  let upstream: Response
  try {
    upstream = await fetch(target.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        // Some CDNs 403 an empty Accept, and a few gate images on a browser UA.
        accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'user-agent': 'PosterSnap/1.0 (+https://github.com/fasilwdr/PosterSnap)',
      },
    })
  } catch {
    return errorResponse(502, 'Could not reach that URL.')
  } finally {
    clearTimeout(timer)
  }

  // A redirect chain can land somewhere private even when the first hop was public.
  try {
    if (upstream.url && isBlockedHost(new URL(upstream.url).hostname)) {
      return errorResponse(403, 'That host is not allowed.')
    }
  } catch {
    /* non-absolute response URL (some runtimes leave it empty) — nothing to re-check */
  }

  if (!upstream.ok) {
    return errorResponse(502, `Upstream responded with ${upstream.status}.`)
  }

  const bytes = await readCapped(upstream)
  if (!bytes) return errorResponse(413, 'That asset is larger than the 12MB proxy limit.')

  const contentType = resolveContentType(upstream.headers.get('content-type'), bytes)
  if (!contentType) return errorResponse(415, 'That URL is not an image or font.')

  // `readCapped` returns a freshly-allocated, zero-offset Uint8Array, so its
  // backing buffer is exactly the payload. Handing over the ArrayBuffer (a
  // global in both the DOM and Node lib typings) sidesteps the DOM lib's
  // refusal to accept a Uint8Array<ArrayBufferLike> as a body.
  return new Response(bytes.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'content-type': contentType,
      'content-length': String(bytes.byteLength),
      'cache-control': 'public, max-age=86400',
      'x-content-type-options': 'nosniff',
    },
  })
}

/** CORS preflight for the proxy route. */
export function assetProxyPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}
