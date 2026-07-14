import type {
  EkoElement,
  ElementType,
  ObjectCapabilities,
} from '@/types/element'
import type { EkoDocument } from '@/types/document'
import type { PropertySchemaField } from '@/types/properties'

export type ObjectRendererKey =
  | 'text'
  | 'image'
  | 'shape'
  | 'group'
  | 'frame'
  | 'table'
  | 'stub'
  | 'none'

export interface ElementDefinition<T extends EkoElement = EkoElement> {
  type: ElementType
  label: string
  /** Lucide / UI icon key — consumed by Layers / Asset panels. */
  icon: string
  /** Canvas renderer adapter key (ObjectLayer lookup). */
  rendererKey: ObjectRendererKey
  capabilities: ObjectCapabilities
  createDefault: (partial?: Partial<T>) => T
  /** Optional property schema override (falls back to propertySchemas). */
  propertySchema?: PropertySchemaField[]
  /** Optional property sanitizer before applying updates. */
  sanitizeProperties?: (
    properties: Record<string, unknown>,
    document: EkoDocument,
  ) => Record<string, unknown>
  /** Optional element-level validator after patch. */
  validate?: (element: T, document: EkoDocument) => { ok: boolean; reason?: string }
}

/**
 * Extensible registry for element types.
 * New types register factories, capabilities, and renderer keys — never change the editor core.
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

  capabilities(type: ElementType): ObjectCapabilities | undefined {
    return this.definitions.get(type)?.capabilities
  }

  create(type: ElementType, partial?: Partial<EkoElement>): EkoElement | null {
    const definition = this.definitions.get(type)
    if (!definition) return null
    return definition.createDefault(partial as Partial<EkoElement>)
  }

  rendererKey(type: ElementType): ObjectRendererKey {
    return this.definitions.get(type)?.rendererKey ?? 'none'
  }
}

export const objectRegistry = new ObjectRegistry()
