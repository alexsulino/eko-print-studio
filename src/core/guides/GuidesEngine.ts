import type { EditorGuide } from '@/types/layout'
import { createId } from '@/utils/id'

export interface GuideSnapTarget {
  orientation: 'vertical' | 'horizontal'
  position: number
  kind: 'guide'
  id: string
}

/**
 * Guides Engine — persistent editing aids (not production output).
 * Supports lock / visibility / page scope prep for multi-page shared guides.
 */
export class GuidesEngine {
  private guides: EditorGuide[] = []
  private visible = true

  list(options?: { includeHidden?: boolean; pageId?: string | null }): EditorGuide[] {
    const includeHidden = options?.includeHidden ?? false
    return this.guides
      .filter((g) => {
        if (!includeHidden && g.visible === false) return false
        if (options?.pageId === undefined) return true
        // Global guides (no pageId) + matching page guides
        if (g.pageId == null || g.pageId === '') return true
        return g.pageId === options.pageId
      })
      .map((g) => ({ ...g }))
  }

  setAll(guides: EditorGuide[]): void {
    this.guides = guides.map((g) => ({
      ...g,
      locked: g.locked ?? false,
      visible: g.visible !== false,
    }))
  }

  add(
    orientation: EditorGuide['orientation'],
    position: number,
    options?: { label?: string; pageId?: string | null },
  ): EditorGuide {
    const guide: EditorGuide = {
      id: createId('guide'),
      orientation,
      position,
      label: options?.label,
      locked: false,
      visible: true,
      pageId: options?.pageId ?? null,
    }
    this.guides.push(guide)
    return { ...guide }
  }

  remove(id: string): boolean {
    const before = this.guides.length
    this.guides = this.guides.filter((g) => g.id !== id)
    return this.guides.length !== before
  }

  clear(): void {
    this.guides = []
  }

  setLocked(id: string, locked: boolean): boolean {
    const guide = this.guides.find((g) => g.id === id)
    if (!guide) return false
    guide.locked = locked
    return true
  }

  setGuideVisible(id: string, visible: boolean): boolean {
    const guide = this.guides.find((g) => g.id === id)
    if (!guide) return false
    guide.visible = visible
    return true
  }

  /** Global visibility for all guides (layer toggle). */
  setVisible(visible: boolean): void {
    this.visible = visible
  }

  isVisible(): boolean {
    return this.visible
  }

  show(): void {
    this.visible = true
  }

  hide(): void {
    this.visible = false
  }

  move(id: string, position: number): boolean {
    const guide = this.guides.find((g) => g.id === id)
    if (!guide || guide.locked) return false
    guide.position = position
    return true
  }

  /** Snap targets for SnappingEngine (respects visibility + optional page scope). */
  snapTargets(pageId?: string | null): GuideSnapTarget[] {
    if (!this.visible) return []
    return this.list({ pageId }).map((g) => ({
      orientation: g.orientation,
      position: g.position,
      kind: 'guide' as const,
      id: g.id,
    }))
  }

  /** Serialize into document.guides for session persistence. */
  toDocumentGuides(): EditorGuide[] {
    return this.list({ includeHidden: true })
  }

  /** Hydrate from EkoDocument.guides on bootstrap/import. */
  hydrateFromDocument(guides: EditorGuide[] | undefined): void {
    this.setAll(guides ?? [])
  }

  /** Derived layout guides (center / edges) — ephemeral, not stored on document. */
  static deriveDocumentGuides(widthPx: number, heightPx: number): EditorGuide[] {
    return [
      { id: 'derived-center-v', orientation: 'vertical', position: widthPx / 2, label: 'center-x', visible: true },
      { id: 'derived-center-h', orientation: 'horizontal', position: heightPx / 2, label: 'center-y', visible: true },
      { id: 'derived-left', orientation: 'vertical', position: 0, label: 'left', visible: true },
      { id: 'derived-right', orientation: 'vertical', position: widthPx, label: 'right', visible: true },
      { id: 'derived-top', orientation: 'horizontal', position: 0, label: 'top', visible: true },
      { id: 'derived-bottom', orientation: 'horizontal', position: heightPx, label: 'bottom', visible: true },
    ]
  }
}

export const guidesEngine = new GuidesEngine()
