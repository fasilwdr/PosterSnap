const ABACUS_BASE = 'https://abacus.jasoncameron.dev'
const NAMESPACE = 'fasilwdr-postersnap'
const KEY = 'exports-total'

async function readCount(res: Response): Promise<number | null> {
  if (!res.ok) return null
  const data = (await res.json()) as { value?: unknown }
  return typeof data.value === 'number' ? data.value : null
}

// Increments the usage counter and resolves with the new total. Must never
// throw or block an export, so failures (offline, rate-limited, blocked by
// an extension) just resolve to null instead of rejecting.
export async function trackExport(): Promise<number | null> {
  try {
    return await readCount(await fetch(`${ABACUS_BASE}/hit/${NAMESPACE}/${KEY}`))
  } catch {
    return null
  }
}

export async function fetchExportCount(): Promise<number | null> {
  try {
    return await readCount(await fetch(`${ABACUS_BASE}/get/${NAMESPACE}/${KEY}`))
  } catch {
    return null
  }
}
