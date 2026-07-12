import type { EditorGuide } from '@/types/layout'
import { createId } from '@/utils/id'

/**
 * Guides Engine — editing aids only.
 * Guides are NOT part of production documents.
 */
export class GuidesEngine {
  private guides: EditorGuide[] = []

  list(): EditorGuide[] {
    return this.guides.map((g) => ({ ...g }))
  }

  setAll(guides: EditorGuide[]): void {
    this.guides = guides.map((g) => ({ ...g }))
  }

  add(orientation: EditorGuide['orientation'], position: number, label?: string): EditorGuide {
    const guide: EditorGuide = {
      id: createId('guide'),
      orientation,
      position,
      label,
      locked: false,
    }
    this.guides.push(guide)
    return { ...guide }
  }

  remove(id: string): void {
    this.guides = this.guides.filter((g) => g.id !== id)
  }

  clear(): void {
    this.guides = []
  }

  /** Derived layout guides (center / edges) — ephemeral, not stored on document. */
  static deriveDocumentGuides(widthPx: number, heightPx: number): EditorGuide[] {
    return [
      { id: 'derived-center-v', orientation: 'vertical', position: widthPx / 2, label: 'center-x' },
      { id: 'derived-center-h', orientation: 'horizontal', position: heightPx / 2, label: 'center-y' },
      { id: 'derived-left', orientation: 'vertical', position: 0, label: 'left' },
      { id: 'derived-right', orientation: 'vertical', position: widthPx, label: 'right' },
      { id: 'derived-top', orientation: 'horizontal', position: 0, label: 'top' },
      { id: 'derived-bottom', orientation: 'horizontal', position: heightPx, label: 'bottom' },
    ]
  }
}

export const guidesEngine = new GuidesEngine()
