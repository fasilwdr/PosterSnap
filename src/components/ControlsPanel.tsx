import type { ReactNode } from 'react'
import { useAppStore } from '../store/appStore'
import { SIZE_PRESETS } from '../lib/presets'
import type { Scale } from '../types'

const SCALES: Scale[] = [1, 2, 3]

const GIF_DURATION_SLIDER_MAX_MS = 30_000
const GIF_DURATION_HARD_MAX_MS = 60_000

function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-xs font-medium uppercase tracking-wide text-white/45">{label}</span>
      {children}
    </label>
  )
}

const segBase =
  'flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none'
const segActive = 'border-accent/70 bg-accent-strong/25 text-white shadow-[0_0_0_1px_rgba(99,102,241,0.3)]'
const segIdle = 'border-white/10 bg-black/20 text-white/60 hover:border-white/20 hover:bg-white/5'

export default function ControlsPanel() {
  const presetId = useAppStore((s) => s.presetId)
  const width = useAppStore((s) => s.width)
  const height = useAppStore((s) => s.height)
  const scale = useAppStore((s) => s.scale)
  const backgroundMode = useAppStore((s) => s.backgroundMode)
  const backgroundColor = useAppStore((s) => s.backgroundColor)
  const format = useAppStore((s) => s.format)
  const imageQuality = useAppStore((s) => s.imageQuality)
  const animationFps = useAppStore((s) => s.animationFps)
  const animationDurationMs = useAppStore((s) => s.animationDurationMs)

  const applyPreset = useAppStore((s) => s.applyPreset)
  const setWidth = useAppStore((s) => s.setWidth)
  const setHeight = useAppStore((s) => s.setHeight)
  const setScale = useAppStore((s) => s.setScale)
  const setBackgroundMode = useAppStore((s) => s.setBackgroundMode)
  const setBackgroundColor = useAppStore((s) => s.setBackgroundColor)
  const setImageQuality = useAppStore((s) => s.setImageQuality)
  const setAnimationFps = useAppStore((s) => s.setAnimationFps)
  const setAnimationDurationMs = useAppStore((s) => s.setAnimationDurationMs)

  const isQualityFormat = format === 'jpg' || format === 'webp' || format === 'avif'
  const isAnimatedFormat = format === 'gif' || format === 'apng'

  return (
    <section className="flex flex-col gap-4" aria-label="Size and export controls">
      <h2 className="flex items-center gap-2.5 text-sm font-semibold text-white">
        <span className="step-badge">3</span>
        Size &amp; Export
      </h2>

      <Field label="Preset">
        <select value={presetId} onChange={(e) => applyPreset(e.target.value)} className="field-input">
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
            className="field-input"
          />
        </Field>
        <Field label="Height (px)">
          <input
            type="number"
            min={1}
            max={8000}
            value={height}
            onChange={(e) => setHeight(Math.max(1, Number(e.target.value) || 1))}
            className="field-input"
          />
        </Field>
      </div>

      {format === 'ico' && width !== height && (
        <p className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-200">
          ICO favicons are square — a {width}×{height} canvas will be stretched to fit each icon size.
        </p>
      )}

      <Field label="Export scale (resolution)">
        <div className="flex gap-2">
          {SCALES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScale(s)}
              aria-pressed={scale === s}
              className={`${segBase} ${scale === s ? segActive : segIdle}`}
            >
              {s}×
            </button>
          ))}
        </div>
      </Field>

      <Field label="Background">
        <div className="flex items-center gap-3">
          <div className="flex flex-1 items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
            <button
              type="button"
              onClick={() => setBackgroundMode('solid')}
              aria-pressed={backgroundMode === 'solid'}
              className={`flex-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                backgroundMode === 'solid' ? 'bg-accent-strong text-white shadow' : 'text-white/60 hover:bg-white/10'
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
              className={`flex-1 rounded-md px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                backgroundMode === 'transparent' ? 'bg-accent-strong text-white shadow' : 'text-white/60 hover:bg-white/10'
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
              className="h-9 w-11 shrink-0"
            />
          )}
        </div>
      </Field>

      {isQualityFormat && (
        <Field label={`${format.toUpperCase()} quality — ${Math.round(imageQuality * 100)}%`}>
          <input
            type="range"
            min={0.4}
            max={1}
            step={0.05}
            value={imageQuality}
            onChange={(e) => setImageQuality(Number(e.target.value))}
          />
        </Field>
      )}

      {isAnimatedFormat && (
        <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={`FPS — ${animationFps}`}>
              <input
                type="range"
                min={2}
                max={24}
                step={1}
                value={animationFps}
                onChange={(e) => setAnimationFps(Number(e.target.value))}
              />
            </Field>
            <Field label="Duration (s)">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0.5}
                  max={GIF_DURATION_SLIDER_MAX_MS / 1000}
                  step={0.25}
                  value={Math.min(animationDurationMs, GIF_DURATION_SLIDER_MAX_MS) / 1000}
                  onChange={(e) => setAnimationDurationMs(Number(e.target.value) * 1000)}
                  className="flex-1"
                />
                <input
                  type="number"
                  min={0.5}
                  max={GIF_DURATION_HARD_MAX_MS / 1000}
                  step={0.5}
                  value={animationDurationMs / 1000}
                  onChange={(e) => {
                    const seconds = Math.min(
                      GIF_DURATION_HARD_MAX_MS / 1000,
                      Math.max(0.5, Number(e.target.value) || 0.5),
                    )
                    setAnimationDurationMs(seconds * 1000)
                  }}
                  className="field-input w-16 px-2 py-1 text-sm"
                />
              </div>
            </Field>
          </div>
          <p className="text-xs leading-relaxed text-white/40">
            ~{Math.max(2, Math.round((animationDurationMs / 1000) * animationFps))} frames will be captured.
            Longer durations, higher fps, and higher export scale all make the export slower and the
            file bigger.{format === 'apng' && ' APNG keeps full alpha transparency and avoids GIF’s 256-color dithering.'}
          </p>
        </div>
      )}
    </section>
  )
}
