/**
 * Toast viewport — transient, non-blocking feedback mirrored to an ARIA live
 * region so screen readers hear "saved / applied / undone" without losing focus.
 * Actionable toasts (e.g. Undo) carry a button and longer dwell time.
 */
import { useUiStore } from '../store/useUiStore'

export function Toasts() {
  const toasts = useUiStore((s) => s.toasts)
  const dismiss = useUiStore((s) => s.dismissToast)

  const tone = {
    success: 'border-positive/40 bg-card text-text',
    error: 'border-negative/50 bg-card text-text',
    info: 'border-blue/40 bg-card text-text',
  }
  const dot = { success: 'bg-positive', error: 'bg-negative', info: 'bg-blue' }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border px-4 py-3 shadow-lg ${tone[t.kind]}`}
        >
          <span className={`h-2 w-2 shrink-0 rounded-full ${dot[t.kind]}`} aria-hidden />
          <span className="flex-1 text-sm">{t.message}</span>
          {t.action && (
            <button
              onClick={() => {
                t.action!.run()
                dismiss(t.id)
              }}
              className="shrink-0 rounded-md px-2 py-1 text-sm font-medium text-primary hover:bg-surface0/50"
            >
              {t.action.label}
            </button>
          )}
          <button
            onClick={() => dismiss(t.id)}
            className="shrink-0 text-overlay0 hover:text-text"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
