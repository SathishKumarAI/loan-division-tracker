/** Small, accessible, Tailwind-styled UI primitives. */
import type {
  ReactNode,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  ButtonHTMLAttributes,
} from 'react'

export function Card({
  children,
  className = '',
  title,
  subtitle,
  actions,
}: {
  children: ReactNode
  className?: string
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <section
      className={`rounded-xl border border-surface0 bg-card shadow-sm ${className}`}
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-surface0 px-5 py-4">
          <div>
            {title && <h2 className="text-base font-semibold text-text">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-subtext0">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}

type BtnVariant = 'primary' | 'ghost' | 'outline' | 'danger'
export function Button({
  variant = 'outline',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const styles: Record<BtnVariant, string> = {
    primary: 'bg-primary text-oncolor hover:opacity-90 border border-transparent',
    ghost: 'bg-transparent text-text hover:bg-surface0/50 border border-transparent',
    outline: 'bg-card text-text border border-surface1 hover:bg-surface0/40',
    danger: 'bg-transparent text-red border border-red/40 hover:bg-red/10',
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: ReactNode
  hint?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-subtext0">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-overlay0">{hint}</span>}
    </label>
  )
}

const inputBase =
  'w-full rounded-lg border border-surface1 bg-base px-3 py-2 text-sm text-text outline-none focus:border-primary tnum'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputBase} ${props.className ?? ''}`} />
}

export function Tag({
  children,
  color = 'blue',
}: {
  children: ReactNode
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'peach' | 'mauve' | 'overlay0'
}) {
  const map: Record<string, string> = {
    blue: 'bg-blue/15 text-blue',
    green: 'bg-green/15 text-green',
    red: 'bg-red/15 text-red',
    yellow: 'bg-yellow/15 text-yellow',
    peach: 'bg-peach/15 text-peach',
    mauve: 'bg-mauve/15 text-mauve',
    overlay0: 'bg-surface0 text-subtext0',
  }
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${map[color]}`}>
      {children}
    </span>
  )
}

export function Banner({
  kind = 'warning',
  children,
}: {
  kind?: 'warning' | 'error' | 'info' | 'success'
  children: ReactNode
}) {
  const map = {
    warning: 'border-yellow/40 bg-yellow/10 text-yellow',
    error: 'border-red/40 bg-red/10 text-red',
    info: 'border-blue/40 bg-blue/10 text-blue',
    success: 'border-green/40 bg-green/10 text-green',
  }
  return (
    <div className={`rounded-lg border px-4 py-2.5 text-sm ${map[kind]}`} role="alert">
      {children}
    </div>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-surface1 py-12 text-center">
      <p className="font-medium text-text">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-subtext0">{hint}</p>}
    </div>
  )
}
