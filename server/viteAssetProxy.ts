import type { Connect, Plugin } from 'vite'
import type { ServerResponse } from 'node:http'
import { ASSET_PROXY_PATH, assetProxyPreflight, proxyAsset } from './assetProxy.ts'

/**
 * Serves the same asset-proxy route the Cloudflare Worker exposes in
 * production, so `npm run dev` / `npm run preview` behave identically to the
 * deployed app instead of silently dropping non-CORS images from exports.
 */
async function handle(req: Connect.IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const response =
    req.method === 'OPTIONS' ? assetProxyPreflight() : await proxyAsset(url.searchParams.get('url'))

  res.statusCode = response.status
  response.headers.forEach((value, key) => res.setHeader(key, value))
  const body = response.body ? Buffer.from(await response.arrayBuffer()) : null
  res.end(body)
}

export function assetProxyPlugin(): Plugin {
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const path = (req.url ?? '').split('?')[0]
    if (path !== ASSET_PROXY_PATH) {
      next()
      return
    }
    handle(req, res).catch(next)
  }

  return {
    name: 'postersnap:asset-proxy',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}
