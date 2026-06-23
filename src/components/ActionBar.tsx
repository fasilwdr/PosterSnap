import type { RefObject } from 'react'
import { useAppStore } from '../store/appStore'
import { validateHtml } from '../lib/validateHtml'
import { exportGif, exportJpg, exportPdf, exportPng } from '../lib/capture'
import { buildExportFilename, downloadBlob, downloadText } from '../lib/download'
import { generateSkillMd, SKILL_MD_FILENAME } from '../lib/skillMd'

interface ActionBarProps {
  iframeRef: RefObject<HTMLIFrameElement | null>
}

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
  const jpgQuality = useAppStore((s) => s.jpgQuality)
  const gifFps = useAppStore((s) => s.gifFps)
  const gifDurationMs = useAppStore((s) => s.gifDurationMs)

  const triggerRender = useAppStore((s) => s.triggerRender)
  const setInputError = useAppStore((s) => s.setInputError)
  const setIsExporting = useAppStore((s) => s.setIsExporting)
  const setExportProgress = useAppStore((s) => s.setExportProgress)
  const pushToast = useAppStore((s) => s.pushToast)

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
      let blob: Blob
      let ext: string

      if (format === 'png') {
        blob = await exportPng(iframe, baseOpts)
        ext = 'png'
      } else if (format === 'jpg') {
        blob = await exportJpg(iframe, baseOpts, jpgQuality)
        ext = 'jpg'
      } else if (format === 'pdf') {
        blob = await exportPdf(iframe, baseOpts)
        ext = 'pdf'
      } else {
        blob = await exportGif(iframe, {
          ...baseOpts,
          fps: gifFps,
          durationMs: gifDurationMs,
          onProgress: setExportProgress,
        })
        ext = 'gif'
      }

      downloadBlob(blob, buildExportFilename(width, height, ext))
      pushToast('success', `Exported ${ext.toUpperCase()} successfully.`)
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

  const canExport = isRendered && html.trim().length > 0 && !inputError && !isExporting

  return (
    <div className="glass-panel sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl px-5 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleRender}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
        >
          Render
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={!canExport}
          className="rounded-lg bg-gradient-to-r from-indigo-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isExporting
            ? format === 'gif'
              ? `Encoding GIF… ${Math.round(exportProgress * 100)}%`
              : 'Exporting…'
            : `Export ${format.toUpperCase()}`}
        </button>
      </div>
      <button
        type="button"
        onClick={handleDownloadSkillMd}
        className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
      >
        Download Skill MD
      </button>
    </div>
  )
}
