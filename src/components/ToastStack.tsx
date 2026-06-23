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
      className="fixed bottom-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 sm:bottom-5 sm:right-5"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`animate-toast-in flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur-xl ${KIND_STYLES[toast.kind]}`}
        >
          <span className="leading-snug">{toast.text}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
            className="shrink-0 rounded p-0.5 text-current/60 transition hover:text-current"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
