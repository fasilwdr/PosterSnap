export type ExportFormat = 'png' | 'jpg' | 'gif' | 'pdf'

export type BackgroundMode = 'transparent' | 'solid'

export type ZoomLevel = 'fit' | 50 | 100 | 200

export type Scale = 1 | 2 | 3

export interface SizePreset {
  id: string
  label: string
  width: number
  height: number
}

export interface ToastMessage {
  id: string
  kind: 'success' | 'error' | 'info'
  text: string
}
