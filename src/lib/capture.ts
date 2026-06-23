import html2canvas from 'html2canvas'
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
  return html2canvas(root, {
    width,
    height,
    scale,
    backgroundColor: backgroundMode === 'transparent' ? null : backgroundColor,
    useCORS: true,
    logging: false,
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
 * html2canvas doesn't actually read the live DOM directly — it builds its
 * own clone of the document to capture from. Cloning copies attributes and
 * inline styles, but not runtime animation state, so a Web Animations API
 * effect seeked via `currentTime` has no visible effect on the clone unless
 * its resulting computed style is baked into a literal inline style first.
 *
 * Separately, html2canvas also forcibly zeroes `animationDuration` on any
 * element with an active CSS animation (`animation-duration` > 0) before
 * cloning, presumably to get a stable read. Combined with
 * `animation-fill-mode: forwards`, that snaps an in-progress animation
 * straight to its end keyframe — so naively capturing a *live* CSS
 * animation produces the same "finished" pose on every frame.
 *
 * The fix combines both: each CSS animation is permanently disabled
 * (`animation: none`) for the whole export — so html2canvas never sees a
 * non-zero animation-duration to neutralize — and re-created as an
 * independent Web Animations API `Animation`, detached from the `animation`
 * CSS property, using the same keyframes/timing. That detached animation is
 * seeked once per frame; doing the disable/re-create just once up front
 * (rather than toggling it every frame) avoids forcing the browser to
 * recreate the implicit CSS animation's internal state on every capture.
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
  // inline style, since that's what html2canvas's internal clone actually
  // sees — overwrites the previous frame's baked value, so no per-frame
  // restore is needed (only the original pre-export value, restored once at
  // teardown).
  // Baked values must NOT use `!important`: the CSS cascade ranks animation
  // effects *above* normal-priority author declarations but *below*
  // `!important` ones. An `!important` bake would permanently outrank the
  // detached animation's own contribution on every subsequent frame's
  // computed-style read, freezing every frame at whatever value was first
  // baked. A normal-priority bake loses to the still-active animation when
  // read back here (so each frame reflects the live seek), while still
  // being visible to html2canvas's clone, which has no competing animation.
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

export interface GifOptions extends CaptureOptions {
  fps: number
  durationMs: number
  onProgress?: (fraction: number) => void
}

export async function exportGif(iframe: HTMLIFrameElement, opts: GifOptions): Promise<Blob> {
  const { fps, durationMs, onProgress, ...rawCaptureOpts } = opts
  const frameInterval = Math.max(20, Math.round(1000 / fps))
  const frameCount = Math.max(2, Math.round(durationMs / frameInterval))
  // Each frame re-runs a full html2canvas capture; capping resolution keeps
  // per-frame cost low enough to actually keep up with the requested fps.
  const captureOpts = { ...rawCaptureOpts, scale: Math.min(rawCaptureOpts.scale, 2) }

  const [{ default: GIF }] = await Promise.all([import('gif.js'), restartAnimation(iframe)])

  const doc = iframe.contentDocument
  if (!doc) {
    throw new Error('Preview is not ready yet. Click Render and wait for the preview to load.')
  }
  const rig = prepareAnimationRig(doc)
  const view = doc.defaultView ?? window

  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: captureOpts.width,
    height: captureOpts.height,
    workerScript: `${import.meta.env.BASE_URL}gif.worker.js`,
  })

  // CSS-driven animations are deterministically seeked per frame (above), so
  // their timing no longer depends on real wall-clock pacing. We still wait
  // out the real cadence between captures so any JS-driven (e.g.
  // requestAnimationFrame) effects in the user's HTML keep progressing
  // naturally, since those can't be paused/seeked the same way.
  const startTime = performance.now()
  for (let i = 0; i < frameCount; i++) {
    const targetElapsed = i * frameInterval
    const remaining = targetElapsed - (performance.now() - startTime)
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining))
    }

    await seekFrame(rig, view, targetElapsed)
    const canvas = await captureCanvas(iframe, captureOpts)

    gif.addFrame(canvas, { copy: true, delay: frameInterval })
    onProgress?.((i + 1) / frameCount)
  }

  teardownAnimationRig(rig)

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
