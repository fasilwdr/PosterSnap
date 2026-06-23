const MAX_HTML_LENGTH = 2_000_000 // ~2MB of markup is generous for a poster snippet

export interface ValidationResult {
  ok: boolean
  error: string | null
}

export function validateHtml(html: string): ValidationResult {
  const trimmed = html.trim()

  if (trimmed.length === 0) {
    return { ok: false, error: 'Paste or upload some HTML before rendering.' }
  }

  if (trimmed.length > MAX_HTML_LENGTH) {
    return { ok: false, error: `Content is too large (${(trimmed.length / 1_000_000).toFixed(1)}MB). Keep it under 2MB.` }
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(trimmed, 'text/html')
  const parserError = doc.querySelector('parsererror')
  if (parserError) {
    return { ok: false, error: 'The HTML could not be parsed. Check for unclosed or malformed tags.' }
  }

  return { ok: true, error: null }
}

export function validateUploadedFile(file: File): ValidationResult {
  const isHtml = file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm')
  if (!isHtml) {
    return { ok: false, error: 'Please upload a .html or .htm file.' }
  }
  if (file.size > MAX_HTML_LENGTH) {
    return { ok: false, error: `File is too large (${(file.size / 1_000_000).toFixed(1)}MB). Keep it under 2MB.` }
  }
  return { ok: true, error: null }
}
