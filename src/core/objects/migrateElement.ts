import type { EkoElement } from '@/types/element'
import { normalizeTransform } from '@/types/element'
import { StyleEngine } from '@/core/objects/StyleEngine'

/**
 * Migrate a legacy element into the unified object contract.
 * Pure — no store / LayerEngine / normalizeDocument imports (avoids cycles).
 */
export function migrateElement(element: EkoElement): EkoElement {
  const ts = new Date().toISOString()
  const appearance = element.appearance ?? StyleEngine.fromProperties(element)
  return {
    ...element,
    createdAt: element.createdAt ?? (element.metadata.createdAt as string | undefined) ?? ts,
    updatedAt: element.updatedAt ?? (element.metadata.updatedAt as string | undefined) ?? ts,
    selectable: element.selectable ?? element.constraints.selectable ?? true,
    transform: normalizeTransform(element.transform),
    appearance,
    layout: element.layout ?? { constraints: [] },
    metadata: {
      createdAt: element.createdAt ?? ts,
      updatedAt: ts,
      ...element.metadata,
    },
  }
}
