import type { EkoElement } from '@/types/element'
import type { ClipboardPayload } from '@/types/interaction'
import { createId } from '@/utils/id'

/**
 * Clipboard Engine — copies EkoDocument elements only (never Konva nodes).
 */
export class ClipboardEngine {
  private payload: ClipboardPayload | null = null

  hasContent(): boolean {
    return Boolean(this.payload && this.payload.elements.length > 0)
  }

  getPayload(): ClipboardPayload | null {
    return this.payload ? structuredClone(this.payload) : null
  }

  copy(elements: EkoElement[]): ClipboardPayload {
    this.payload = {
      elements: structuredClone(elements),
      copiedAt: Date.now(),
    }
    return this.getPayload()!
  }

  /** Clone elements with new ids and optional position offset (document space). */
  cloneElements(elements: EkoElement[], offset = { x: 24, y: 24 }): EkoElement[] {
    const maxZ = elements.reduce((max, el) => Math.max(max, el.zIndex), 0)
    return elements.map((el, index) => {
      const clone = structuredClone(el) as EkoElement
      return {
        ...clone,
        id: createId(el.type),
        name: clone.name ? `${clone.name} copy` : clone.name,
        zIndex: maxZ + index + 1,
        transform: {
          ...clone.transform,
          x: clone.transform.x + offset.x,
          y: clone.transform.y + offset.y,
        },
      }
    })
  }

  paste(offset = { x: 24, y: 24 }): EkoElement[] {
    if (!this.payload) return []
    return this.cloneElements(this.payload.elements, offset)
  }

  duplicate(elements: EkoElement[], offset = { x: 24, y: 24 }): EkoElement[] {
    return this.cloneElements(elements, offset)
  }

  clear(): void {
    this.payload = null
  }
}

export const clipboardEngine = new ClipboardEngine()
