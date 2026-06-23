import { create } from 'zustand'
import { DEFAULT_PRESET_ID, SIZE_PRESETS } from '../lib/presets'
import type { BackgroundMode, ExportFormat, Scale, ToastMessage, ZoomLevel } from '../types'

const defaultPreset = SIZE_PRESETS.find((p) => p.id === DEFAULT_PRESET_ID)!

interface AppState {
  // Input
  html: string
  fileName: string | null
  inputError: string | null

  // Size & style controls
  presetId: string
  width: number
  height: number
  scale: Scale
  backgroundMode: BackgroundMode
  backgroundColor: string

  // Export controls
  format: ExportFormat
  jpgQuality: number
  gifFps: number
  gifDurationMs: number

  // Preview
  zoom: ZoomLevel
  renderToken: number
  isRendered: boolean

  // Export status
  isExporting: boolean
  exportProgress: number

  // Toasts
  toasts: ToastMessage[]

  setHtml: (html: string) => void
  setFileName: (name: string | null) => void
  setInputError: (error: string | null) => void
  applyPreset: (presetId: string) => void
  setWidth: (width: number) => void
  setHeight: (height: number) => void
  setScale: (scale: Scale) => void
  setBackgroundMode: (mode: BackgroundMode) => void
  setBackgroundColor: (color: string) => void
  setFormat: (format: ExportFormat) => void
  setJpgQuality: (quality: number) => void
  setGifFps: (fps: number) => void
  setGifDurationMs: (ms: number) => void
  setZoom: (zoom: ZoomLevel) => void
  triggerRender: () => void
  setIsRendered: (rendered: boolean) => void
  setIsExporting: (exporting: boolean) => void
  setExportProgress: (progress: number) => void
  pushToast: (kind: ToastMessage['kind'], text: string) => void
  dismissToast: (id: string) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  html: '',
  fileName: null,
  inputError: null,

  presetId: defaultPreset.id,
  width: defaultPreset.width,
  height: defaultPreset.height,
  scale: 1,
  backgroundMode: 'solid',
  backgroundColor: '#ffffff',

  format: 'png',
  jpgQuality: 0.9,
  gifFps: 10,
  gifDurationMs: 2000,

  zoom: 'fit',
  renderToken: 0,
  isRendered: false,

  isExporting: false,
  exportProgress: 0,

  toasts: [],

  setHtml: (html) => set({ html, isRendered: false }),
  setFileName: (fileName) => set({ fileName }),
  setInputError: (inputError) => set({ inputError }),

  applyPreset: (presetId) => {
    const preset = SIZE_PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    set({ presetId, width: preset.width, height: preset.height })
  },
  setWidth: (width) => set({ width, presetId: 'custom' }),
  setHeight: (height) => set({ height, presetId: 'custom' }),
  setScale: (scale) => set({ scale }),
  setBackgroundMode: (backgroundMode) => set({ backgroundMode }),
  setBackgroundColor: (backgroundColor) => set({ backgroundColor }),

  setFormat: (format) =>
    set((state) => ({
      format,
      backgroundMode: format === 'jpg' ? 'solid' : state.backgroundMode,
    })),
  setJpgQuality: (jpgQuality) => set({ jpgQuality }),
  setGifFps: (gifFps) => set({ gifFps }),
  setGifDurationMs: (gifDurationMs) => set({ gifDurationMs }),

  setZoom: (zoom) => set({ zoom }),
  triggerRender: () => set((state) => ({ renderToken: state.renderToken + 1, isRendered: false })),
  setIsRendered: (isRendered) => set({ isRendered }),

  setIsExporting: (isExporting) => set({ isExporting }),
  setExportProgress: (exportProgress) => set({ exportProgress }),

  pushToast: (kind, text) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    set({ toasts: [...get().toasts, { id, kind, text }] })
    setTimeout(() => get().dismissToast(id), 4500)
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))
