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
    <section className="flex h-full flex-col gap-3" aria-label="HTML input">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
          1. Provide HTML
        </h2>
        {fileName && <span className="text-xs text-white/40">{fileName}</span>}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/80 transition hover:bg-white/10"
        >
          Upload .html file
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
        className="min-h-0 flex-1 resize-none rounded-xl border border-white/10 bg-black/30 p-4 font-mono text-[13px] leading-relaxed text-white/90 outline-none placeholder:text-white/25 focus:border-accent/60"
      />

      {inputError && (
        <p id="html-editor-error" role="alert" className="text-sm text-rose-300">
          {inputError}
        </p>
      )}
    </section>
  )
}
