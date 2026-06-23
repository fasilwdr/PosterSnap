import { forwardRef, useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store/appStore'
import type { ZoomLevel } from '../types'

const ZOOM_OPTIONS: ZoomLevel[] = ['fit', 50, 100, 200]

const PreviewPane = forwardRef<HTMLIFrameElement>(function PreviewPane(_props, iframeRef) {
  const html = useAppStore((s) => s.html)
  const width = useAppStore((s) => s.width)
  const height = useAppStore((s) => s.height)
  const backgroundMode = useAppStore((s) => s.backgroundMode)
  const backgroundColor = useAppStore((s) => s.backgroundColor)
  const zoom = useAppStore((s) => s.zoom)
  const setZoom = useAppStore((s) => s.setZoom)
  const renderToken = useAppStore((s) => s.renderToken)
  const setIsRendered = useAppStore((s) => s.setIsRendered)

  const containerRef = useRef<HTMLDivElement>(null)
  const [fitScale, setFitScale] = useState(1)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const compute = () => {
      const padding = 48
      const availableW = el.clientWidth - padding
      const availableH = el.clientHeight - padding
      const scale = Math.min(availableW / width, availableH / height, 1)
      const next = scale > 0 ? scale : 1
      // Bail out on sub-pixel changes so a ResizeObserver -> setState -> relayout
      // cycle can't thrash (returns the same value -> React skips the re-render).
      setFitScale((prev) => (Math.abs(prev - next) < 0.005 ? prev : next))
    }
    compute()
    const observer = new ResizeObserver(compute)
    observer.observe(el)
    return () => observer.disconnect()
  }, [width, height])

  const displayScale = zoom === 'fit' ? fitScale : zoom / 100
  const hasContent = html.trim().length > 0

  return (
    <section className="flex h-full min-h-0 flex-col gap-3" aria-label="Live preview">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-sm font-semibold text-white">
          <span className="step-badge">2</span>
          Preview
          <span className="ml-1 rounded-md bg-white/5 px-2 py-0.5 font-mono text-xs font-normal text-white/45">
            {width} × {height}
            {displayScale !== 1 && ` · ${Math.round(displayScale * 100)}%`}
          </span>
        </h2>
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
          {ZOOM_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setZoom(option)}
              aria-pressed={zoom === option}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                zoom === option ? 'bg-accent-strong text-white shadow' : 'text-white/55 hover:bg-white/10'
              }`}
            >
              {option === 'fit' ? 'Fit' : `${option}%`}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={containerRef}
        className={`relative flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-xl border border-white/10 shadow-inner ${
          backgroundMode === 'transparent' ? 'checker-bg' : ''
        }`}
        style={backgroundMode === 'solid' ? { backgroundColor } : undefined}
      >
        {!hasContent && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-white/40">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
            <p className="text-sm">Paste or upload HTML to see a live preview</p>
          </div>
        )}
        <div
          style={{
            width: width * displayScale,
            height: height * displayScale,
          }}
        >
          <div
            style={{
              width,
              height,
              transform: `scale(${displayScale})`,
              transformOrigin: 'top left',
            }}
          >
            <iframe
              key={renderToken}
              ref={iframeRef}
              title="HTML preview"
              srcDoc={html || '<!doctype html><html><body></body></html>'}
              sandbox="allow-scripts allow-same-origin"
              onLoad={() => setIsRendered(true)}
              style={{
                width,
                height,
                border: 'none',
                background: 'transparent',
                display: 'block',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  )
})

export default PreviewPane
