import { ASSET_PROXY_PATH } from '../../server/assetProxy.ts'

/**
 * Resolves remote asset URLs (`<img src>`, CSS `url(...)`, SVG `<image href>`)
 * into data URLs so the exporter can bake them into the output.
 *
 * Why this is needed at all: the rasterizer paints from an SVG
 * `<foreignObject>` clone, which has no network access — every referenced
 * asset has to be inlined as a data URL first. Inlining means *reading the
 * bytes*, and a browser will only let a page read a cross-origin response
 * when the server opts in with `Access-Control-Allow-Origin`. Most image hosts
 * don't, so `fetch()` rejects and modern-screenshot substitutes a transparent
 * placeholder — the image silently disappears from the export while still
 * showing fine in the preview (where the browser paints it without ever
 * exposing the pixels to script).
 *
 * Strategy, in order, per URL:
 *  1. `data:` / same-origin — hand back to modern-screenshot's own fetcher.
 *  2. Direct CORS fetch — works for CDNs that send the header.
 *  3. Our own `/api/proxy` (Cloudflare Worker in production, Vite middleware
 *     in dev) — re-serves the bytes same-origin.
 *  4. A public image proxy — the last resort on static hosts (GitHub Pages)
 *     where step 3 doesn't exist.
 */

/** Public CORS image proxy, used only when our own route is unavailable. */
const PUBLIC_PROXY = (url: string) => `https://images.weserv.nl/?url=${encodeURIComponent(url)}&n=-1`

const selfProxyUrl = (url: string) =>
  `${import.meta.env.BASE_URL}${ASSET_PROXY_PATH.replace(/^\//, '')}?url=${encodeURIComponent(url)}`

/** 1x1 transparent PNG — matches modern-screenshot's own placeholder. */
const TRANSPARENT_PIXEL = 'data:image/png;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

const FETCH_TIMEOUT_MS = 20_000

/**
 * Resolved data URLs, keyed by `${proxyAllowed}|${url}`. Module-level and
 * deliberately long-lived: an animated export re-captures the same DOM dozens
 * of times, and each capture builds a fresh modern-screenshot context with its
 * own (empty) request cache — without this, every frame would re-download
 * every image.
 */
const cache = new Map<string, Promise<string | null>>()

/**
 * Set once `/api/proxy` has been shown to be absent (static hosting), so the
 * remaining assets skip straight to the public proxy instead of each paying
 * for a doomed request.
 */
let selfProxyAvailable: boolean | null = null

export interface AssetResolverOptions {
  /** When false, only direct CORS fetches are attempted (no proxying at all). */
  proxy: boolean
}

export interface AssetResolver {
  /** Pass as modern-screenshot's `fetchFn`. */
  fetchFn: (url: string) => Promise<string | false>
  /** URLs that could not be inlined during this export, for user-facing warnings. */
  failedUrls: () => string[]
  /** Inlines every remote asset referenced by `root`, mutating it in place. */
  inlineInto: (root: Element) => Promise<void>
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('Could not read asset.'))
    reader.readAsDataURL(blob)
  })
}

async function fetchAsDataUrl(url: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, { mode: 'cors', cache: 'force-cache', signal: controller.signal })
    if (!response.ok) throw new Error(`Request failed with ${response.status}`)
    const blob = await response.blob()
    // A static host answers an unknown /api/* path with its SPA fallback
    // (index.html) rather than a 404, so a 200 alone doesn't prove the proxy
    // exists — an HTML body means it doesn't.
    if (blob.type.startsWith('text/html')) throw new Error('Response is not an asset')
    if (blob.size === 0) throw new Error('Response is empty')
    return await blobToDataUrl(blob)
  } finally {
    clearTimeout(timer)
  }
}

function isSameOrigin(url: string): boolean {
  try {
    return new URL(url, location.href).origin === location.origin
  } catch {
    return false
  }
}

async function resolveRemote(url: string, proxy: boolean): Promise<string | null> {
  try {
    return await fetchAsDataUrl(url)
  } catch {
    /* blocked by CORS (the common case), offline, or a hard error — try a proxy */
  }
  if (!proxy) return null

  if (selfProxyAvailable !== false) {
    try {
      const dataUrl = await fetchAsDataUrl(selfProxyUrl(url))
      selfProxyAvailable = true
      return dataUrl
    } catch {
      // Only mark the route as missing when we've never seen it work; a single
      // upstream 404 for one image shouldn't disable it for the others.
      if (selfProxyAvailable === null) selfProxyAvailable = false
    }
  }

  try {
    return await fetchAsDataUrl(PUBLIC_PROXY(url))
  } catch {
    return null
  }
}

function resolve(url: string, proxy: boolean): Promise<string | null> {
  const key = `${proxy ? 'p' : 'd'}|${url}`
  let pending = cache.get(key)
  if (!pending) {
    pending = resolveRemote(url, proxy)
    cache.set(key, pending)
  }
  return pending
}

const CSS_URL_PATTERN = /url\((['"]?)([^'")]+)\1\)/g

export function createAssetResolver({ proxy }: AssetResolverOptions): AssetResolver {
  const failed = new Set<string>()

  async function toDataUrl(url: string): Promise<string | null> {
    const dataUrl = await resolve(url, proxy)
    if (!dataUrl) failed.add(url)
    return dataUrl
  }

  const fetchFn = async (url: string): Promise<string | false> => {
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) return false
    // Same-origin assets need no help — modern-screenshot's own fetcher (which
    // can also route through its worker pool) handles them fine.
    if (isSameOrigin(url)) return false
    const dataUrl = await toDataUrl(url)
    // Returning the placeholder rather than `false` stops the library from
    // repeating the request we already know is blocked.
    return dataUrl ?? TRANSPARENT_PIXEL
  }

  async function inlineStyleUrls(cssText: string): Promise<string> {
    const urls = new Set<string>()
    for (const [, , raw] of cssText.matchAll(CSS_URL_PATTERN)) {
      if (raw && !raw.startsWith('data:') && !isSameOrigin(raw)) urls.add(raw)
    }
    if (urls.size === 0) return cssText

    const resolved = new Map<string, string>()
    await Promise.all(
      Array.from(urls, async (url) => {
        const dataUrl = await toDataUrl(url)
        if (dataUrl) resolved.set(url, dataUrl)
      }),
    )
    return cssText.replace(CSS_URL_PATTERN, (match, quote: string, raw: string) => {
      const dataUrl = resolved.get(raw)
      return dataUrl ? `url(${quote}${dataUrl}${quote})` : match
    })
  }

  /**
   * Used by the SVG export, which serializes markup instead of rasterizing it
   * and so never passes through modern-screenshot's `fetchFn`.
   */
  async function inlineInto(root: Element): Promise<void> {
    const jobs: Promise<void>[] = []

    for (const img of Array.from(root.querySelectorAll('img'))) {
      const src = img.getAttribute('src')
      if (!src || src.startsWith('data:')) continue
      const absolute = new URL(src, document.baseURI).href
      jobs.push(
        toDataUrl(absolute).then((dataUrl) => {
          if (!dataUrl) return
          img.setAttribute('src', dataUrl)
          img.removeAttribute('srcset')
        }),
      )
    }

    for (const image of Array.from(root.querySelectorAll('image'))) {
      const href = image.getAttribute('href') ?? image.getAttribute('xlink:href')
      if (!href || href.startsWith('data:') || href.startsWith('#')) continue
      jobs.push(
        toDataUrl(new URL(href, document.baseURI).href).then((dataUrl) => {
          if (!dataUrl) return
          image.setAttribute('href', dataUrl)
          image.removeAttribute('xlink:href')
        }),
      )
    }

    for (const el of Array.from(root.querySelectorAll('[style]'))) {
      const style = el.getAttribute('style')
      if (!style || !style.includes('url(')) continue
      jobs.push(inlineStyleUrls(style).then((next) => el.setAttribute('style', next)))
    }

    for (const styleEl of Array.from(root.querySelectorAll('style'))) {
      const css = styleEl.textContent
      if (!css || !css.includes('url(')) continue
      jobs.push(
        inlineStyleUrls(css).then((next) => {
          styleEl.textContent = next
        }),
      )
    }

    await Promise.all(jobs)
  }

  return { fetchFn, failedUrls: () => Array.from(failed), inlineInto }
}
