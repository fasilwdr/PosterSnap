import { useRef } from 'react'
import { useAppStore } from '../store/appStore'
import { validateHtml, validateUploadedFile } from '../lib/validateHtml'

const PLACEHOLDER = `<!-- Paste a self-contained HTML snippet, e.g. -->
<div style="width:600px;height:400px;display:flex;align-items:center;
  justify-content:center;background:linear-gradient(135deg,#6366f1,#ec4899);
  font-family:sans-serif;color:white;">
  <h1>Your Poster Here</h1>
</div>`

export default function InputPanel() {
  const html = useAppStore((s) => s.html)
  const fileName = useAppStore((s) => s.fileName)
  const inputError = useAppStore((s) => s.inputError)
  const setHtml = useAppStore((s) => s.setHtml)
  const setFileName = useAppStore((s) => s.setFileName)
  const setInputError = useAppStore((s) => s.setInputError)
  const pushToast = useAppStore((s) => s.pushToast)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleHtmlChange(value: string) {
    setHtml(value)
    if (inputError) setInputError(null)
  }

  function handleFileSelected(file: File | undefined) {
    if (!file) return
    const validation = validateUploadedFile(file)
    if (!validation.ok) {
      setInputError(validation.error)
      pushToast('error', validation.error!)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const content = String(reader.result ?? '')
      setHtml(content)
      setFileName(file.name)
      setInputError(null)
      pushToast('success', `Loaded ${file.name}`)
    }
    reader.onerror = () => {
      setInputError('Could not read the selected file.')
      pushToast('error', 'Could not read the selected file.')
    }
    reader.readAsText(file)
  }

  function handleBlurValidate() {
    if (html.trim().length === 0) return
    const result = validateHtml(html)
    setInputError(result.error)
  }

  return (
    <section className="flex h-full min-h-0 flex-col gap-3" aria-label="HTML input">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-sm font-semibold text-white">
          <span className="step-badge">1</span>
          Provide HTML
        </h2>
        {fileName && (
          <span className="max-w-[140px] truncate rounded-md bg-white/5 px-2 py-0.5 text-xs text-white/50">
            {fileName}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/80 transition hover:border-white/25 hover:bg-white/10"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Upload .html
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".html,.htm,text/html"
          className="hidden"
          aria-label="Upload HTML file"
          onChange={(e) => handleFileSelected(e.target.files?.[0])}
        />
        {html.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setHtml('')
              setFileName(null)
              setInputError(null)
            }}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/50 transition hover:bg-white/5 hover:text-white/80"
          >
            Clear
          </button>
        )}
      </div>

      <label htmlFor="html-editor" className="sr-only">
        HTML source
      </label>
      <textarea
        id="html-editor"
        value={html}
        onChange={(e) => handleHtmlChange(e.target.value)}
        onBlur={handleBlurValidate}
        placeholder={PLACEHOLDER}
        spellCheck={false}
        aria-invalid={Boolean(inputError)}
        aria-describedby={inputError ? 'html-editor-error' : undefined}
        className={`min-h-[140px] flex-1 resize-none rounded-xl border bg-black/40 p-4 font-mono text-[13px] leading-relaxed text-white/90 outline-none transition placeholder:text-white/25 focus:ring-2 ${
          inputError
            ? 'border-rose-400/60 focus:ring-rose-500/20'
            : 'border-white/10 focus:border-accent/60 focus:ring-indigo-500/20'
        }`}
      />

      {inputError && (
        <p id="html-editor-error" role="alert" className="flex items-start gap-1.5 text-sm text-rose-300">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {inputError}
        </p>
      )}
    </section>
  )
}
