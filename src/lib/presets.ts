import type { SizePreset } from '../types'

export const SIZE_PRESETS: SizePreset[] = [
  { id: 'instagram-post', label: 'Instagram Post — 1080×1080', width: 1080, height: 1080 },
  { id: 'instagram-story', label: 'Instagram Story — 1080×1920', width: 1080, height: 1920 },
  { id: 'linkedin-post', label: 'LinkedIn Post — 1200×627', width: 1200, height: 627 },
  { id: 'a4-poster', label: 'A4 Poster — 1240×1754', width: 1240, height: 1754 },
  { id: 'custom', label: 'Custom', width: 800, height: 600 },
]

export const DEFAULT_PRESET_ID = 'instagram-post'
