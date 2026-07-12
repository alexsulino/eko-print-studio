import type { EkoElement, ElementType } from '@/types/element'
import type { EkoDocument } from '@/types/document'

export interface ElementDefinition<T extends EkoElement = EkoElement> {
  type: ElementType
  label: string
  createDefault: (partial?: Partial<T>) => T
  /** Optional property sanitizer before applying updates. */
  sanitizeProperties?: (properties: Record<string, unknown>, document: EkoDocument) => Record<string, unknown>
}

/**
 * Extensible registry for element types.
 * New types (QR, barcode, SVG…) register without changing the editor core.
 */
export class ObjectRegistry {
  private definitions = new Map<ElementType, ElementDefinition>()

  register<T extends EkoElement>(definition: ElementDefinition<T>): void {
    this.definitions.set(definition.type, definition as ElementDefinition)
  }

  get(type: ElementType): ElementDefinition | undefined {
    return this.definitions.get(type)
  }

  has(type: ElementType): boolean {
    return this.definitions.has(type)
  }

  list(): ElementDefinition[] {
    return [...this.definitions.values()]
  }
}

export const objectRegistry = new ObjectRegistry()
