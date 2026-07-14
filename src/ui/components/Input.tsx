import type { InputHTMLAttributes } from 'react'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`eko-input ${props.className ?? ''}`.trim()} {...props} />
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Buscar…',
  ...rest
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <input
      className="eko-search"
      type="search"
      value={value}
      placeholder={placeholder}
      aria-label={rest['aria-label'] ?? placeholder}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    />
  )
}

export function NumberInput({
  value,
  onChange,
  ...rest
}: {
  value: number
  onChange: (value: number) => void
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>) {
  return (
    <input
      className="eko-input"
      type="number"
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value))}
      {...rest}
    />
  )
}
