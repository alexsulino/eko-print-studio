/**
 * Design tokens — single source for Creator UI styling.
 * Components must consume CSS variables / these JS tokens — never hardcode palette.
 */

export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
} as const

export const radius = {
  none: '0',
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px',
} as const

export const typography = {
  fontFamily: '"Segoe UI", "IBM Plex Sans", "Helvetica Neue", sans-serif',
  fontFamilyDisplay: '"Segoe UI Semibold", "IBM Plex Sans", sans-serif',
  sizeXs: '0.75rem',
  sizeSm: '0.8125rem',
  sizeMd: '0.875rem',
  sizeLg: '1rem',
  sizeXl: '1.25rem',
  weightRegular: '400',
  weightMedium: '500',
  weightSemibold: '600',
  weightBold: '700',
  lineHeightTight: '1.25',
  lineHeightNormal: '1.4',
} as const

export const elevation = {
  0: 'none',
  1: '0 1px 2px rgba(20, 32, 51, 0.06)',
  2: '0 4px 12px rgba(20, 32, 51, 0.1)',
  3: '0 12px 28px rgba(20, 32, 51, 0.14)',
  4: '0 18px 40px rgba(20, 32, 51, 0.16)',
} as const

export const animation = {
  fast: '120ms',
  normal: '180ms',
  slow: '280ms',
  ease: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
} as const

export const shadow = elevation

export const border = {
  thin: '1px',
  medium: '1.5px',
  thick: '2px',
} as const

export type ThemeId = 'light' | 'dark' | 'canva'

export interface ThemePalette {
  bg: string
  panel: string
  panelElevated: string
  ink: string
  muted: string
  line: string
  accent: string
  accentInk: string
  danger: string
  warning: string
  success: string
  focus: string
  canvas: string
  overlay: string
}

export const themes: Record<ThemeId, ThemePalette> = {
  light: {
    bg: '#e8eef5',
    panel: '#f8fafc',
    panelElevated: '#ffffff',
    ink: '#142033',
    muted: '#5b6b7c',
    line: '#c9d6e5',
    accent: '#0f6b4c',
    accentInk: '#ffffff',
    danger: '#9b1c1c',
    warning: '#b45309',
    success: '#047857',
    focus: '#2563eb',
    canvas: '#dfe6ef',
    overlay: 'rgba(20, 32, 51, 0.45)',
  },
  dark: {
    bg: '#0f1419',
    panel: '#1a222c',
    panelElevated: '#232d3a',
    ink: '#e8eef6',
    muted: '#94a3b8',
    line: '#2f3b4a',
    accent: '#34d399',
    accentInk: '#042f2e',
    danger: '#f87171',
    warning: '#fbbf24',
    success: '#34d399',
    focus: '#60a5fa',
    canvas: '#121820',
    overlay: 'rgba(0, 0, 0, 0.55)',
  },
  canva: {
    bg: '#edf1f7',
    panel: '#ffffff',
    panelElevated: '#ffffff',
    ink: '#0e1318',
    muted: '#6b7280',
    line: '#e5e7eb',
    accent: '#8b3dff',
    accentInk: '#ffffff',
    danger: '#dc2626',
    warning: '#d97706',
    success: '#059669',
    focus: '#7c3aed',
    canvas: '#e5e7eb',
    overlay: 'rgba(14, 19, 24, 0.4)',
  },
}
