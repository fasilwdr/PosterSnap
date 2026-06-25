import { domToCanvas } from 'modern-screenshot'
import type { BackgroundMode } from '../types'

export interface CaptureOptions {
  width: number
  height: number
  scale: number
  backgroundMode: BackgroundMode
  backgroundColor: string
}

function getIframeRoot(iframe: HTMLIFrameElement): HTMLElement {
  const doc = iframe.contentDocument
  if (!doc || !doc.body) {
    throw new Error('Preview is not ready yet. Click Render and wait for the preview to load.')
  }
  return doc.body
}

export async function captureCanvas(
  iframe: HTMLIFrameElement,
  { width, height, scale, backgroundMode, backgroundColor }: CaptureOptions,
): Promise<HTMLCanvasElement> {
  const root = getIframeRoot(iframe)
  // modern-screenshot rasterizes by serializing the node into an SVG
  // <foreignObject> and letting the browser's own engine paint it. Unlike
  // html2canvas (which reimplements CSS itself and silently drops anything it
  // doesn't support), this renders gradient-clipped text
  // (`background-clip: text`), `backdrop-filter`, `filter`, `mix-blend-mode`,
  // etc. exactly as they appear in the live preview — so the export matches
  // what the user sees. It also auto-embeds same-origin/CORS-enabled images
  // and @font-face fonts as data URLs so they survive the foreignObject
  // sandbox (which has no network access).
  return domToCanvas(root, {
    width,
    height,
    scale,
    backgroundColor: backgroundMode === 'transparent' ? null : backgroundColor,
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to encode image.'))
      },
      type,
      quality,
    )
  })
}

export async function exportPng(iframe: HTMLIFrameElement, opts: CaptureOptions): Promise<Blob> {
  const canvas = await captureCanvas(iframe, opts)
  return canvasToBlob(canvas, 'image/png')
}

export async function exportJpg(
  iframe: HTMLIFrameElement,
  opts: CaptureOptions,
  quality: number,
): Promise<Blob> {
  // JPG has no alpha channel; force a solid background so transparency doesn't turn black.
  const canvas = await captureCanvas(iframe, {
    ...opts,
    backgroundMode: 'solid',
    backgroundColor: opts.backgroundMode === 'solid' ? opts.backgroundColor : '#ffffff',
  })
  return canvasToBlob(canvas, 'image/jpeg', quality)
}

export async function exportWebp(
  iframe: HTMLIFrameElement,
  opts: CaptureOptions,
  quality: number,
): Promise<Blob> {
  const canvas = await captureCanvas(iframe, opts)
  const blob = await canvasToBlob(canvas, 'image/webp', quality)
  // Browsers that can't encode a requested type silently fall back to PNG
  // instead of rejecting — check the returned mime to detect that.
  if (blob.type !== 'image/webp') {
    throw new Error('This browser cannot encode WebP images.')
  }
  return blob
}

export async function exportAvif(
  iframe: HTMLIFrameElement,
  opts: CaptureOptions,
  quality: number,
): Promise<Blob> {
  const canvas = await captureCanvas(iframe, opts)
  const blob = await canvasToBlob(canvas, 'image/avif', quality)
  if (blob.type !== 'image/avif') {
    throw new Error('This browser cannot encode AVIF images yet — try a recent Chrome or Firefox.')
  }
  return blob
}

const ICO_SIZES = [16, 32, 48, 256] as const

function resizeCanvas(source: HTMLCanvasElement, size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create a canvas context for ICO resizing.')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, size, size)
  return canvas
}

/**
 * Packs the rendered capture into a multi-resolution .ico (16/32/48/256px),
 * each entry embedding a PNG directly — supported by Windows Vista+ and every
 * modern ICO reader, so no BMP re-encoding is needed.
 */
export async function exportIco(iframe: HTMLIFrameElement, opts: CaptureOptions): Promise<Blob> {
  const canvas = await captureCanvas(iframe, opts)
  const pngBuffers = await Promise.all(
    ICO_SIZES.map(async (size) => {
      const blob = await canvasToBlob(resizeCanvas(canvas, size), 'image/png')
      return new Uint8Array(await blob.arrayBuffer())
    }),
  )

  const headerSize = 6 + 16 * pngBuffers.length
  const totalSize = headerSize + pngBuffers.reduce((sum, buf) => sum + buf.length, 0)
  const out = new Uint8Array(totalSize)
  const view = new DataView(out.buffer)

  view.setUint16(2, 1, true) // type: icon
  view.setUint16(4, pngBuffers.length, true)

  let dataOffset = headerSize
  pngBuffers.forEach((buf, i) => {
    const entryOffset = 6 + i * 16
    const size = ICO_SIZES[i]
    out[entryOffset] = size >= 256 ? 0 : size // width (0 means 256)
    out[entryOffset + 1] = size >= 256 ? 0 : size // height (0 means 256)
    view.setUint16(entryOffset + 4, 1, true) // color planes
    view.setUint16(entryOffset + 6, 32, true) // bits per pixel
    view.setUint32(entryOffset + 8, buf.length, true) // bytes in resource
    view.setUint32(entryOffset + 12, dataOffset, true) // offset of image data
    out.set(buf, dataOffset)
    dataOffset += buf.length
  })

  return new Blob([out], { type: 'image/x-icon' })
}

/**
 * Wraps the iframe's live, parsed document in an SVG <foreignObject>. This is
 * not a vector trace of the artwork — it's the original HTML/CSS re-embedded
 * inside an SVG shell, so it stays crisp at any scale and re-renders in
 * browsers/other web pages, but most vector editors (Illustrator, Inkscape,
 * Figma) don't support foreignObject styling and will show it blank or
 * unstyled. Serializing the *parsed* DOM (via XMLSerializer), rather than the
 * raw HTML string, is what guarantees well-formed XML here — arbitrary HTML
 * (unescaped `&`, unclosed void tags, etc.) is not valid XML on its own.
 */
export async function exportSvg(iframe: HTMLIFrameElement, opts: CaptureOptions): Promise<Blob> {
  const doc = iframe.contentDocument
  if (!doc?.documentElement) {
    throw new Error('Preview is not ready yet. Click Render and wait for the preview to load.')
  }
  const serializedHtml = new XMLSerializer().serializeToString(doc.documentElement)
  const background =
    opts.backgroundMode === 'solid' ? `<rect width="100%" height="100%" fill="${opts.backgroundColor}"/>` : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${opts.width}" height="${opts.height}" viewBox="0 0 ${opts.width} ${opts.height}">${background}<foreignObject x="0" y="0" width="${opts.width}" height="${opts.height}">${serializedHtml}</foreignObject></svg>`
  return new Blob([svg], { type: 'image/svg+xml' })
}

export async function exportPdf(iframe: HTMLIFrameElement, opts: CaptureOptions): Promise<Blob> {
  const [{ jsPDF }, canvas] = await Promise.all([import('jspdf'), captureCanvas(iframe, opts)])
  const dataUrl = canvas.toDataURL('image/png')
  const pdf = new jsPDF({
    unit: 'px',
    hotfixes: ['px_scaling'],
    format: [opts.width, opts.height],
    orientation: opts.width >= opts.height ? 'landscape' : 'portrait',
  })
  pdf.addImage(dataUrl, 'PNG', 0, 0, opts.width, opts.height)
  return pdf.output('blob')
}

function waitForIframeLoad(iframe: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve) => {
    const handleLoad = () => {
      iframe.removeEventListener('load', handleLoad)
      resolve()
    }
    iframe.addEventListener('load', handleLoad)
  })
}

/**
 * Rewrites the iframe's document in place via document.open/write/close so
 * CSS/JS animations restart from frame zero. `contentWindow.location.reload()`
 * is a no-op for `srcdoc` documents in Chromium, so it can't be used here —
 * without an actual restart, a finite (non-looping) animation may already be
 * over by the time the user clicks Export, and every captured frame would be
 * an identical "end state" snapshot.
 */
async function restartAnimation(iframe: HTMLIFrameElement): Promise<void> {
  const doc = iframe.contentDocument
  if (!doc) return
  const html = iframe.srcdoc
  const loaded = waitForIframeLoad(iframe)
  doc.open()
  doc.write(html)
  doc.close()
  await loaded
}

interface AnimationTarget {
  el: HTMLElement
  props: string[]
  originalValues: Array<{ prop: string; value: string; priority: string }>
  originalAnimation: { value: string; priority: string }
}

interface AnimationRig {
  // Independent, CSS-detached copies of each original CSS animation, fully
  // controlled via `currentTime`.
  detached: Animation[]
  targets: AnimationTarget[]
}

function toKebabCase(prop: string): string {
  if (prop.startsWith('--')) return prop
  return prop.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
}

/**
 * Like every clone-based rasterizer (html2canvas, and now modern-screenshot's
 * foreignObject pipeline), the exporter doesn't snapshot the live DOM in
 * place — it builds a clone to paint from. A *live* CSS animation would be
 * sampled at whatever wall-clock moment the clone happens to read it, so
 * naively capturing an animation yields an unpredictable (often "finished",
 * with `animation-fill-mode: forwards`) pose on every frame instead of a
 * controlled progression.
 *
 * The fix: each CSS animation is permanently disabled (`animation: none`) for
 * the whole export and re-created as an independent Web Animations API
 * `Animation`, detached from the `animation` CSS property, using the same
 * keyframes/timing. That detached animation is deterministically seeked once
 * per frame (`currentTime`), and its resulting computed style is baked into a
 * literal inline style so the clone reproduces exactly that frame. Doing the
 * disable/re-create just once up front (rather than toggling it every frame)
 * avoids forcing the browser to recreate the implicit CSS animation's
 * internal state on every capture.
 */
function prepareAnimationRig(doc: Document): AnimationRig {
  // The iframe's content runs in a separate JS realm, so constructing
  // Animation/KeyframeEffect via *our* globals (rather than the iframe's
  // own) is unreliable — use the iframe's own window.
  const view = (doc.defaultView ?? window) as Window & {
    Animation: typeof Animation
    KeyframeEffect: typeof KeyframeEffect
  }

  const originalAnimations = doc.getAnimations()
  const detached: Animation[] = []
  const targets: AnimationTarget[] = []

  for (const animation of originalAnimations) {
    // Cross-realm `instanceof` checks against our own globals always fail,
    // so duck-type instead.
    const effect = animation.effect as KeyframeEffect | null
    if (!effect || typeof effect.getKeyframes !== 'function') continue
    const el = effect.target
    if (!el || el.nodeType !== 1 || !('style' in el)) continue
    const htmlEl = el as HTMLElement

    const keyframes = effect.getKeyframes()
    const timing = effect.getTiming()

    const props = new Set<string>()
    for (const keyframe of keyframes) {
      for (const key of Object.keys(keyframe)) {
        if (key === 'offset' || key === 'easing' || key === 'composite' || key === 'computedOffset') continue
        props.add(toKebabCase(key))
      }
    }

    const originalValues = Array.from(props, (prop) => ({
      prop,
      value: htmlEl.style.getPropertyValue(prop),
      priority: htmlEl.style.getPropertyPriority(prop),
    }))
    const originalAnimation = {
      value: htmlEl.style.getPropertyValue('animation'),
      priority: htmlEl.style.getPropertyPriority('animation'),
    }
    htmlEl.style.setProperty('animation', 'none', 'important')

    const detachedEffect = new view.KeyframeEffect(htmlEl, keyframes, timing)
    const detachedAnimation = new view.Animation(detachedEffect, htmlEl.ownerDocument.timeline)
    detachedAnimation.pause()
    detached.push(detachedAnimation)
    targets.push({ el: htmlEl, props: Array.from(props), originalValues, originalAnimation })
  }

  return { detached, targets }
}

async function seekFrame(rig: AnimationRig, view: Window, timeMs: number): Promise<void> {
  for (const animation of rig.detached) {
    animation.currentTime = timeMs
  }
  // Setting `currentTime` only takes effect for getComputedStyle purposes
  // once the browser processes its next animation-frame update; reading
  // computed style synchronously right after the seek can observe a stale
  // (pre-seek) value. A single rAF tick is sometimes still too early under
  // load, so wait for two consecutive ticks — the standard "double rAF"
  // pattern for guaranteeing a full style/layout cycle has completed before
  // the seek is read back.
  await new Promise<void>((resolve) => {
    view.requestAnimationFrame(() => {
      view.requestAnimationFrame(() => resolve())
    })
  })

  // Bake the seeked animation's resulting computed style into a literal
  // inline style, since that's what the rasterizer's clone actually sees —
  // overwrites the previous frame's baked value, so no per-frame restore is
  // needed (only the original pre-export value, restored once at teardown).
  // Baked values must NOT use `!important`: the CSS cascade ranks animation
  // effects *above* normal-priority author declarations but *below*
  // `!important` ones. An `!important` bake would permanently outrank the
  // detached animation's own contribution on every subsequent frame's
  // computed-style read, freezing every frame at whatever value was first
  // baked. A normal-priority bake loses to the still-active animation when
  // read back here (so each frame reflects the live seek), while still
  // being visible to the clone, which has no competing animation.
  for (const { el, props } of rig.targets) {
    const computed = getComputedStyle(el)
    for (const prop of props) {
      el.style.setProperty(prop, computed.getPropertyValue(prop))
    }
  }
}

function teardownAnimationRig(rig: AnimationRig): void {
  for (const animation of rig.detached) animation.cancel()
  for (const { el, props, originalValues, originalAnimation } of rig.targets) {
    for (const prop of props) el.style.removeProperty(prop)
    for (const { prop, value, priority } of originalValues) {
      if (value) el.style.setProperty(prop, value, priority)
    }
    if (originalAnimation.value) el.style.setProperty('animation', originalAnimation.value, originalAnimation.priority)
    else el.style.removeProperty('animation')
  }
}

export interface AnimationCaptureOptions extends CaptureOptions {
  fps: number
  durationMs: number
  onProgress?: (fraction: number) => void
}

interface FrameTiming {
  frameInterval: number
  frameCount: number
}

function computeFrameTiming(fps: number, durationMs: number): FrameTiming {
  const frameInterval = Math.max(20, Math.round(1000 / fps))
  const frameCount = Math.max(2, Math.round(durationMs / frameInterval))
  return { frameInterval, frameCount }
}

/**
 * Drives the per-frame capture loop shared by every animated export format
 * (GIF, APNG, …): restarts the iframe's animation, builds the seekable
 * animation rig, then for each frame seeks + captures + hands the canvas to
 * `onFrame` for that format's own encoder to consume.
 */
async function runAnimationCapture(
  iframe: HTMLIFrameElement,
  captureOpts: CaptureOptions,
  timing: FrameTiming,
  onProgress: ((fraction: number) => void) | undefined,
  onFrame: (canvas: HTMLCanvasElement, frameIndex: number) => void | Promise<void>,
): Promise<void> {
  await restartAnimation(iframe)

  const doc = iframe.contentDocument
  if (!doc) {
    throw new Error('Preview is not ready yet. Click Render and wait for the preview to load.')
  }
  const rig = prepareAnimationRig(doc)
  const view = doc.defaultView ?? window

  // CSS-driven animations are deterministically seeked per frame (above), so
  // their timing no longer depends on real wall-clock pacing. We still wait
  // out the real cadence between captures so any JS-driven (e.g.
  // requestAnimationFrame) effects in the user's HTML keep progressing
  // naturally, since those can't be paused/seeked the same way.
  const startTime = performance.now()
  for (let i = 0; i < timing.frameCount; i++) {
    const targetElapsed = i * timing.frameInterval
    const remaining = targetElapsed - (performance.now() - startTime)
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining))
    }

    await seekFrame(rig, view, targetElapsed)
    const canvas = await captureCanvas(iframe, captureOpts)

    await onFrame(canvas, i)
    onProgress?.((i + 1) / timing.frameCount)
  }

  teardownAnimationRig(rig)
}

export type GifOptions = AnimationCaptureOptions

export async function exportGif(iframe: HTMLIFrameElement, opts: GifOptions): Promise<Blob> {
  const { fps, durationMs, onProgress, ...rawCaptureOpts } = opts
  const timing = computeFrameTiming(fps, durationMs)
  // Each frame re-runs a full capture; capping resolution keeps per-frame
  // cost low enough to actually keep up with the requested fps.
  const captureOpts = { ...rawCaptureOpts, scale: Math.min(rawCaptureOpts.scale, 2) }

  const [{ default: GIF }] = await Promise.all([import('gif.js')])

  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: captureOpts.width,
    height: captureOpts.height,
    workerScript: `${import.meta.env.BASE_URL}gif.worker.js`,
  })

  await runAnimationCapture(iframe, captureOpts, timing, onProgress, (canvas) => {
    gif.addFrame(canvas, { copy: true, delay: timing.frameInterval })
  })

  return new Promise((resolve, reject) => {
    gif.on('finished', (blob: Blob) => resolve(blob))
    gif.on('abort', () => reject(new Error('GIF encoding was aborted.')))
    try {
      gif.render()
    } catch (err) {
      reject(err instanceof Error ? err : new Error('GIF encoding failed.'))
    }
  })
}

export type ApngOptions = AnimationCaptureOptions

/**
 * Animated PNG export: reuses the exact same animation-seek rig as GIF, but
 * encodes the raw RGBA frames with UPNG.js instead of gif.js. Unlike GIF,
 * this keeps true 8-bit alpha and isn't limited to a 256-color palette, so
 * transparent animated posters don't dither or lose their background.
 */
export async function exportApng(iframe: HTMLIFrameElement, opts: ApngOptions): Promise<Blob> {
  const { fps, durationMs, onProgress, ...rawCaptureOpts } = opts
  const timing = computeFrameTiming(fps, durationMs)
  const captureOpts = { ...rawCaptureOpts, scale: Math.min(rawCaptureOpts.scale, 2) }

  const [{ default: UPNG }] = await Promise.all([import('upng-js')])

  const frames: ArrayBuffer[] = []
  const delays: number[] = []
  let pixelWidth = 0
  let pixelHeight = 0

  await runAnimationCapture(iframe, captureOpts, timing, onProgress, (canvas) => {
    pixelWidth = canvas.width
    pixelHeight = canvas.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not read canvas pixels for APNG encoding.')
    frames.push(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer)
    delays.push(timing.frameInterval)
  })

  // colors=0 keeps full 8-bit truecolor + alpha (no palette quantization).
  const buffer = UPNG.encode(frames, pixelWidth, pixelHeight, 0, delays)
  return new Blob([buffer], { type: 'image/png' })
}
