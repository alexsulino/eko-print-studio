import type { EkoDocument } from '@/types/document'
import type { EkoElement, ElementType } from '@/types/element'
import { objectRegistry } from '@/core/registry/ObjectRegistry'
import { ensureBuiltinsRegistered } from '@/core/registry/registerBuiltins'
import { NamingEngine } from '@/core/objects/NamingEngine'

/**
 * Object Factory — single entry for creating document elements via ObjectRegistry.
 * Always applies naming + registry defaults; never invent types outside the registry.
 */
export class ObjectFactory {
  static create(
    document: EkoDocument,
    type: ElementType,
    partial?: Partial<EkoElement>,
  ): EkoElement | null {
    ensureBuiltinsRegistered()
    const created = objectRegistry.create(type, partial)
    if (!created) return null
    const name =
      partial?.name ??
      NamingEngine.nextName(
        document.elements,
        objectRegistry.get(type)?.label ?? type,
      )
    return { ...created, name }
  }

  static createMany(
    document: EkoDocument,
    specs: Array<{ type: ElementType; partial?: Partial<EkoElement> }>,
  ): EkoElement[] {
    let working = document
    const out: EkoElement[] = []
    for (const spec of specs) {
      const el = ObjectFactory.create(working, spec.type, spec.partial)
      if (!el) continue
      out.push(el)
      working = {
        ...working,
        elements: [...working.elements, el],
      }
    }
    return out
  }
}
