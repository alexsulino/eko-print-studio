/**
 * Element Ownership Model (Document Graph)
 *
 * Canonical storage: `document.elements[]` (flat list — Interaction Engine).
 *
 * Ownership chain (logical):
 *   Document → Page → Surface → (Region spatial) → Layer order → Element
 *   Element may nest under Group via `parentId` + group.properties.childIds
 *
 * Rules:
 * - Surface.elementIds claims which root-level elements belong to a face.
 * - parentId / group childIds define nesting (no cycles).
 * - Regions are spatial constraints, not exclusive owners (element.regionId optional).
 * - Document never loses flat elements[]; graph is derived + validated.
 */

export type OwnershipContainer = 'document' | 'page' | 'surface' | 'region' | 'group'

export interface OwnershipResolution {
  elementId: string
  container: OwnershipContainer
  containerId: string | null
  pageId: string | null
  surfaceId: string | null
  regionId: string | null
  parentId: string | null
}
