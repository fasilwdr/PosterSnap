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
      setFitScale(scale > 0 ? scale : 1)
    }
    compute()
    const observer = new ResizeObserver(compute)
    observer.observe(el)
    return () => observer.disconnect()
  }, [width, height])

  const displayScale = zoom === 'fit' ? fitScale : zoom / 100

  return (
    <section className="flex h-full flex-col gap-3" aria-label="Live preview">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
          2. Preview
        </h2>
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
          {ZOOM_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setZoom(option)}
              aria-pressed={zoom === option}
              className={`rounded-md px-2.5 py-1 text-xs transition ${
                zoom === option ? 'bg-accent-strong text-white' : 'text-white/60 hover:bg-white/10'
              }`}
            >
              {option === 'fit' ? 'Fit' : `${option}%`}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={containerRef}
        className={`relative flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-xl border border-white/10 ${
          backgroundMode === 'transparent' ? 'checker-bg' : ''
        }`}
        style={backgroundMode === 'solid' ? { backgroundColor } : undefined}
      >
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
