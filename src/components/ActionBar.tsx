import type { RefObject } from 'react'
import { useAppStore } from '../store/appStore'
import { validateHtml } from '../lib/validateHtml'
import {
  exportApng,
  exportAvif,
  exportGif,
  exportIco,
  exportJpg,
  exportPdf,
  exportPng,
  exportSvg,
  exportWebp,
} from '../lib/capture'
import { buildExportFilename, downloadBlob, downloadText } from '../lib/download'
import { generateSkillMd, SKILL_MD_FILENAME } from '../lib/skillMd'
import { trackExport } from '../lib/analytics'
import type { ExportFormat } from '../types'

interface ActionBarProps {
  iframeRef: RefObject<HTMLIFrameElement | null>
}

const FORMATS: { id: ExportFormat; label: string }[] = [
  { id: 'png', label: 'PNG' },
  { id: 'jpg', label: 'JPG' },
  { id: 'webp', label: 'WebP' },
  { id: 'avif', label: 'AVIF' },
  { id: 'gif', label: 'GIF' },
  { id: 'apng', label: 'APNG' },
  { id: 'pdf', label: 'PDF' },
  { id: 'svg', label: 'SVG' },
  { id: 'ico', label: 'ICO' },
]

export default function ActionBar({ iframeRef }: ActionBarProps) {
  const html = useAppStore((s) => s.html)
  const inputError = useAppStore((s) => s.inputError)
  const isRendered = useAppStore((s) => s.isRendered)
  const isExporting = useAppStore((s) => s.isExporting)
  const exportProgress = useAppStore((s) => s.exportProgress)
  const format = useAppStore((s) => s.format)
  const width = useAppStore((s) => s.width)
  const height = useAppStore((s) => s.height)
  const scale = useAppStore((s) => s.scale)
  const backgroundMode = useAppStore((s) => s.backgroundMode)
  const backgroundColor = useAppStore((s) => s.backgroundColor)
  const imageQuality = useAppStore((s) => s.imageQuality)
  const animationFps = useAppStore((s) => s.animationFps)
  const animationDurationMs = useAppStore((s) => s.animationDurationMs)

  const triggerRender = useAppStore((s) => s.triggerRender)
  const setFormat = useAppStore((s) => s.setFormat)
  const setInputError = useAppStore((s) => s.setInputError)
  const setIsExporting = useAppStore((s) => s.setIsExporting)
  const setExportProgress = useAppStore((s) => s.setExportProgress)
  const pushToast = useAppStore((s) => s.pushToast)
  const setExportCount = useAppStore((s) => s.setExportCount)

  function recordExport() {
    void trackExport().then((count) => {
      if (count !== null) setExportCount(count)
    })
  }

  function handleRender() {
    const result = validateHtml(html)
    if (!result.ok) {
      setInputError(result.error)
      pushToast('error', result.error!)
      return
    }
    setInputError(null)
    triggerRender()
    pushToast('info', 'Preview rendered.')
  }

  async function handleExport() {
    const iframe = iframeRef.current
    if (!iframe) return

    setIsExporting(true)
    setExportProgress(0)
    try {
      const baseOpts = { width, height, scale, backgroundMode, backgroundColor }
      const animationOpts = { ...baseOpts, fps: animationFps, durationMs: animationDurationMs, onProgress: setExportProgress }
      let blob: Blob
      let ext: string

      switch (format) {
        case 'png':
          blob = await exportPng(iframe, baseOpts)
          ext = 'png'
          break
        case 'jpg':
          blob = await exportJpg(iframe, baseOpts, imageQuality)
          ext = 'jpg'
          break
        case 'webp':
          blob = await exportWebp(iframe, baseOpts, imageQuality)
          ext = 'webp'
          break
        case 'avif':
          blob = await exportAvif(iframe, baseOpts, imageQuality)
          ext = 'avif'
          break
        case 'pdf':
          blob = await exportPdf(iframe, baseOpts)
          ext = 'pdf'
          break
        case 'svg':
          blob = await exportSvg(iframe, baseOpts)
          ext = 'svg'
          break
        case 'ico':
          blob = await exportIco(iframe, baseOpts)
          ext = 'ico'
          break
        case 'apng':
          blob = await exportApng(iframe, animationOpts)
          ext = 'apng'
          break
        case 'gif':
          blob = await exportGif(iframe, animationOpts)
          ext = 'gif'
          break
      }

      downloadBlob(blob, buildExportFilename(width, height, ext))
      pushToast('success', `Exported ${ext.toUpperCase()} successfully.`)
      recordExport()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed.'
      pushToast('error', message)
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }

  function handleDownloadSkillMd() {
    downloadText(generateSkillMd(), SKILL_MD_FILENAME)
    pushToast('success', `Downloaded ${SKILL_MD_FILENAME}`)
  }

  async function handleCopyToClipboard() {
    const iframe = iframeRef.current
    if (!iframe) return
    try {
      const blob = await exportPng(iframe, { width, height, scale, backgroundMode, backgroundColor })
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      pushToast('success', 'Copied PNG to clipboard.')
      recordExport()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not copy to clipboard.'
      pushToast('error', message)
    }
  }

  const canExport = isRendered && html.trim().length > 0 && !inputError && !isExporting
  const isAnimatedFormat = format === 'gif' || format === 'apng'
  const animationPct = Math.round(exportProgress * 100)

  return (
    <div className="glass-panel relative flex flex-col gap-4 overflow-hidden rounded-2xl px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-5">
      {isExporting && isAnimatedFormat && (
        <div
          className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-indigo-500 to-pink-500 transition-[width] duration-200"
          style={{ width: `${animationPct}%` }}
        />
      )}

      {/* Left cluster: render preview, choose format, then export */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={handleRender}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:border-white/25 hover:bg-white/15"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          Render
        </button>

        <div className="hidden h-7 w-px bg-white/10 sm:block" />

        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-1" role="group" aria-label="Export format">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFormat(f.id)}
              aria-pressed={format === f.id}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                format === f.id ? 'bg-accent-strong text-white shadow' : 'text-white/55 hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={!canExport}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-pink-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {isExporting ? (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              {isAnimatedFormat ? `Encoding ${format.toUpperCase()}… ${animationPct}%` : 'Exporting…'}
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export {format.toUpperCase()}
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleCopyToClipboard}
          disabled={!canExport}
          title="Copy a PNG snapshot to the clipboard"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy PNG
        </button>
      </div>

      {/* Right cluster: skill md */}
      <button
        type="button"
        onClick={handleDownloadSkillMd}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        Download Skill MD
      </button>
    </div>
  )
}
