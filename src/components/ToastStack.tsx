import { useAppStore } from '../store/appStore'

const KIND_STYLES: Record<string, string> = {
  success: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200',
  error: 'border-rose-400/40 bg-rose-500/15 text-rose-200',
  info: 'border-indigo-400/40 bg-indigo-500/15 text-indigo-200',
}

export default function ToastStack() {
  const toasts = useAppStore((s) => s.toasts)
  const dismissToast = useAppStore((s) => s.dismissToast)

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex w-80 flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`glass-panel flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${KIND_STYLES[toast.kind]}`}
        >
          <span className="leading-snug">{toast.text}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
            className="shrink-0 text-current/70 hover:text-current"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
