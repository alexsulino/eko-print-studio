import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost' | 'danger'
  children: ReactNode
}

export function Button({ variant = 'default', className = '', children, type = 'button', ...rest }: ButtonProps) {
  const variantClass =
    variant === 'primary'
      ? 'eko-btn--primary'
      : variant === 'ghost'
        ? 'eko-btn--ghost'
        : variant === 'danger'
          ? 'eko-btn--danger'
          : ''
  return (
    <button type={type} className={`eko-btn ${variantClass} ${className}`.trim()} {...rest}>
      {children}
    </button>
  )
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
}

export function IconButton({ label, className = '', children, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      className={`eko-btn eko-icon-btn ${className}`.trim()}
      aria-label={label}
      title={rest.title ?? label}
      {...rest}
    >
      {children}
    </button>
  )
}
