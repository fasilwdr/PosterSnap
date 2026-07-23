import { ASSET_PROXY_PATH, assetProxyPreflight, proxyAsset } from '../server/assetProxy.ts'

interface Env {
  /** Static-assets binding declared in wrangler.jsonc (`assets.binding`). */
  ASSETS: { fetch: (request: Request) => Promise<Response> }
}

/**
 * Cloudflare Workers entry point. Everything except the asset-proxy route is
 * handed straight back to the static-asset binding, which keeps the existing
 * SPA behaviour (`not_found_handling: single-page-application`) intact.
 *
 * `assets.run_worker_first` in wrangler.jsonc is what guarantees `/api/*`
 * reaches this handler instead of being swallowed by the SPA fallback.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === ASSET_PROXY_PATH) {
      if (request.method === 'OPTIONS') return assetProxyPreflight()
      return proxyAsset(url.searchParams.get('url'))
    }
    return env.ASSETS.fetch(request)
  },
}
