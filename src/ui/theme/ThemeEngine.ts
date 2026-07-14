import { themes, type ThemeId, type ThemePalette } from '../tokens'

/**
 * UI Theme Engine — applies CSS custom properties from tokens.
 * Components never hardcode colors; they read var(--eko-*).
 */
export class ThemeEngine {
  private themeId: ThemeId = 'canva'

  getThemeId(): ThemeId {
    return this.themeId
  }

  getPalette(): ThemePalette {
    return themes[this.themeId]
  }

  setTheme(id: ThemeId, root?: HTMLElement | null): void {
    this.themeId = id
    const palette = themes[id]
    const target =
      root ?? (typeof document !== 'undefined' ? document.documentElement : null)
    if (!target) return

    target.setAttribute('data-theme', id)
    target.style.setProperty('--eko-bg', palette.bg)
    target.style.setProperty('--eko-panel', palette.panel)
    target.style.setProperty('--eko-panel-elevated', palette.panelElevated)
    target.style.setProperty('--eko-ink', palette.ink)
    target.style.setProperty('--eko-muted', palette.muted)
    target.style.setProperty('--eko-line', palette.line)
    target.style.setProperty('--eko-accent', palette.accent)
    target.style.setProperty('--eko-accent-ink', palette.accentInk)
    target.style.setProperty('--eko-danger', palette.danger)
    target.style.setProperty('--eko-warning', palette.warning)
    target.style.setProperty('--eko-success', palette.success)
    target.style.setProperty('--eko-focus', palette.focus)
    target.style.setProperty('--eko-canvas', palette.canvas)
    target.style.setProperty('--eko-overlay', palette.overlay)

    // Back-compat aliases used by existing editor CSS
    target.style.setProperty('--bg', palette.bg)
    target.style.setProperty('--panel', palette.panel)
    target.style.setProperty('--ink', palette.ink)
    target.style.setProperty('--muted', palette.muted)
    target.style.setProperty('--line', palette.line)
    target.style.setProperty('--accent', palette.accent)
    target.style.setProperty('--accent-ink', palette.accentInk)
    target.style.setProperty('--danger', palette.danger)
  }
}

export const themeEngine = new ThemeEngine()
