import type { ReactNode } from 'react'

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      className="eko-switch"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span className="eko-switch__thumb" />
    </button>
  )
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel = 'Tabs',
}: {
  items: Array<{ id: T; label: string }>
  value: T
  onChange: (id: T) => void
  ariaLabel?: string
}) {
  return (
    <div className="eko-tabs" role="tablist" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          className="eko-tabs__tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="eko-badge">{children}</span>
}

export function Divider() {
  return <hr className="eko-divider" />
}

export function Spinner({ label = 'Carregando' }: { label?: string }) {
  return <div className="eko-spinner" role="status" aria-label={label} />
}

export function Skeleton({ width = '100%', height = '1rem' }: { width?: string | number; height?: string | number }) {
  return <div className="eko-skeleton" style={{ width, height }} aria-hidden />
}

export function Progress({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className="eko-progress" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <div className="eko-progress__bar" style={{ width: `${clamped}%` }} />
    </div>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="eko-empty">
      <h3>{title}</h3>
      {hint ? <p>{hint}</p> : null}
    </div>
  )
}
