export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadText(text: string, filename: string, mime = 'text/markdown') {
  downloadBlob(new Blob([text], { type: mime }), filename)
}

export function buildExportFilename(width: number, height: number, ext: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `postersnap_${timestamp}_${width}x${height}.${ext}`
}
