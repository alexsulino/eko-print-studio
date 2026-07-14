import type { EkoElement } from '@/types/element'
import type { ClipboardPayload } from '@/types/interaction'
import { createId } from '@/utils/id'

/**
 * Clipboard Engine — copies EkoDocument elements only (never Konva nodes).
 * Internal clipboard first; OS clipboard bridge is prepared via serialize/deserialize helpers.
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

  /**
   * Cut places elements on the clipboard; deletion is the store's responsibility
   * (Commands → History) so cut remains a pure clipboard write.
   */
  cut(elements: EkoElement[]): ClipboardPayload {
    return this.copy(elements)
  }

  /**
   * Clone elements with new ids, optional offset, and remapped parent/group refs
   * so multi-element paste preserves hierarchy relationships.
   */
  cloneElements(elements: EkoElement[], offset = { x: 24, y: 24 }): EkoElement[] {
    const idMap = new Map<string, string>()
    for (const el of elements) {
      idMap.set(el.id, createId(el.type))
    }

    const maxZ = elements.reduce((max, el) => Math.max(max, el.zIndex), 0)
    return elements.map((el, index) => {
      const clone = structuredClone(el) as EkoElement
      const nextId = idMap.get(el.id) ?? createId(el.type)
      const parentId =
        clone.parentId && idMap.has(clone.parentId) ? idMap.get(clone.parentId)! : clone.parentId

      return {
        ...clone,
        id: nextId,
        parentId,
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

  /** JSON for future navigator.clipboard write (OS clipboard prep). */
  serializeForSystem(): string | null {
    if (!this.payload) return null
    return JSON.stringify({
      source: 'eko-print-studio',
      version: 1,
      ...this.payload,
    })
  }

  /** Parse OS clipboard JSON produced by serializeForSystem. */
  loadFromSystem(json: string): boolean {
    try {
      const parsed = JSON.parse(json) as {
        source?: string
        elements?: EkoElement[]
        copiedAt?: number
      }
      if (parsed.source !== 'eko-print-studio' || !Array.isArray(parsed.elements)) {
        return false
      }
      this.payload = {
        elements: structuredClone(parsed.elements),
        copiedAt: parsed.copiedAt ?? Date.now(),
      }
      return true
    } catch {
      return false
    }
  }

  clear(): void {
    this.payload = null
  }
}

export const clipboardEngine = new ClipboardEngine()
