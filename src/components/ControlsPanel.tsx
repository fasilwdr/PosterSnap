import type { ReactNode } from 'react'
import { useAppStore } from '../store/appStore'
import { SIZE_PRESETS } from '../lib/presets'
import type { ExportFormat, Scale } from '../types'

const SCALES: Scale[] = [1, 2, 3]
const FORMATS: { id: ExportFormat; label: string }[] = [
  { id: 'png', label: 'PNG' },
  { id: 'jpg', label: 'JPG' },
  { id: 'gif', label: 'GIF' },
  { id: 'pdf', label: 'PDF' },
]

const GIF_DURATION_SLIDER_MAX_MS = 30_000
const GIF_DURATION_HARD_MAX_MS = 60_000

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-white/60">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-white/90 outline-none focus:border-accent/60'

export default function ControlsPanel() {
  const presetId = useAppStore((s) => s.presetId)
  const width = useAppStore((s) => s.width)
  const height = useAppStore((s) => s.height)
  const scale = useAppStore((s) => s.scale)
  const backgroundMode = useAppStore((s) => s.backgroundMode)
  const backgroundColor = useAppStore((s) => s.backgroundColor)
  const format = useAppStore((s) => s.format)
  const jpgQuality = useAppStore((s) => s.jpgQuality)
  const gifFps = useAppStore((s) => s.gifFps)
  const gifDurationMs = useAppStore((s) => s.gifDurationMs)

  const applyPreset = useAppStore((s) => s.applyPreset)
  const setWidth = useAppStore((s) => s.setWidth)
  const setHeight = useAppStore((s) => s.setHeight)
  const setScale = useAppStore((s) => s.setScale)
  const setBackgroundMode = useAppStore((s) => s.setBackgroundMode)
  const setBackgroundColor = useAppStore((s) => s.setBackgroundColor)
  const setFormat = useAppStore((s) => s.setFormat)
  const setJpgQuality = useAppStore((s) => s.setJpgQuality)
  const setGifFps = useAppStore((s) => s.setGifFps)
  const setGifDurationMs = useAppStore((s) => s.setGifDurationMs)

  return (
    <section className="flex flex-col gap-5" aria-label="Size and export controls">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
        3. Size &amp; Export
      </h2>

      <Field label="Preset">
        <select
          value={presetId}
          onChange={(e) => applyPreset(e.target.value)}
          className={inputClass}
        >
          {SIZE_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Width (px)">
          <input
            type="number"
            min={1}
            max={8000}
            value={width}
            onChange={(e) => setWidth(Math.max(1, Number(e.target.value) || 1))}
            className={inputClass}
          />
        </Field>
        <Field label="Height (px)">
          <input
            type="number"
            min={1}
            max={8000}
            value={height}
            onChange={(e) => setHeight(Math.max(1, Number(e.target.value) || 1))}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Export scale (resolution)">
        <div className="flex gap-2">
          {SCALES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScale(s)}
              aria-pressed={scale === s}
              className={`flex-1 rounded-lg border px-3 py-1.5 text-sm transition ${
                scale === s
                  ? 'border-accent bg-accent-strong/30 text-white'
                  : 'border-white/10 bg-black/20 text-white/60 hover:bg-white/5'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </Field>

      <Field label="Background">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
            <button
              type="button"
              onClick={() => setBackgroundMode('solid')}
              aria-pressed={backgroundMode === 'solid'}
              className={`rounded-md px-2.5 py-1 text-xs transition ${
                backgroundMode === 'solid' ? 'bg-accent-strong text-white' : 'text-white/60 hover:bg-white/10'
              }`}
            >
              Solid
            </button>
            <button
              type="button"
              onClick={() => setBackgroundMode('transparent')}
              disabled={format === 'jpg'}
              aria-pressed={backgroundMode === 'transparent'}
              title={format === 'jpg' ? 'JPG does not support transparency' : undefined}
              className={`rounded-md px-2.5 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${
                backgroundMode === 'transparent' ? 'bg-accent-strong text-white' : 'text-white/60 hover:bg-white/10'
              }`}
            >
              Transparent
            </button>
          </div>
          {backgroundMode === 'solid' && (
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              aria-label="Background color"
              className="h-8 w-10 cursor-pointer rounded border border-white/10 bg-transparent"
            />
          )}
        </div>
      </Field>

      <Field label="Export format">
        <div className="flex gap-2">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFormat(f.id)}
              aria-pressed={format === f.id}
              className={`flex-1 rounded-lg border px-3 py-1.5 text-sm transition ${
                format === f.id
                  ? 'border-accent bg-accent-strong/30 text-white'
                  : 'border-white/10 bg-black/20 text-white/60 hover:bg-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Field>

      {format === 'jpg' && (
        <Field label={`JPG quality — ${Math.round(jpgQuality * 100)}%`}>
          <input
            type="range"
            min={0.4}
            max={1}
            step={0.05}
            value={jpgQuality}
            onChange={(e) => setJpgQuality(Number(e.target.value))}
          />
        </Field>
      )}

      {format === 'gif' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={`FPS — ${gifFps}`}>
              <input
                type="range"
                min={2}
                max={24}
                step={1}
                value={gifFps}
                onChange={(e) => setGifFps(Number(e.target.value))}
              />
            </Field>
            <Field label="Duration (seconds)">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0.5}
                  max={GIF_DURATION_SLIDER_MAX_MS / 1000}
                  step={0.25}
                  value={Math.min(gifDurationMs, GIF_DURATION_SLIDER_MAX_MS) / 1000}
                  onChange={(e) => setGifDurationMs(Number(e.target.value) * 1000)}
                  className="flex-1"
                />
                <input
                  type="number"
                  min={0.5}
                  max={GIF_DURATION_HARD_MAX_MS / 1000}
                  step={0.5}
                  value={gifDurationMs / 1000}
                  onChange={(e) => {
                    const seconds = Math.min(
                      GIF_DURATION_HARD_MAX_MS / 1000,
                      Math.max(0.5, Number(e.target.value) || 0.5),
                    )
                    setGifDurationMs(seconds * 1000)
                  }}
                  className={`${inputClass} w-16 px-2 py-1 text-sm`}
                />
              </div>
            </Field>
          </div>
          <p className="text-xs text-white/40">
            ~{Math.max(2, Math.round((gifDurationMs / 1000) * gifFps))} frames will be captured.
            Longer durations, higher fps, and higher export scale all make the export slower and
            the file bigger.
          </p>
        </div>
      )}
    </section>
  )
}
