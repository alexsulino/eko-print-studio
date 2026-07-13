import type { EkoDocument } from '@/types/document'
import type { EkoElement, GroupElement, ImageElement } from '@/types/element'

export interface DocumentHealthIssue {
  code: string
  message: string
  severity: 'error' | 'warning'
  elementId?: string
}

export interface DocumentHealthReport {
  valid: boolean
  errors: DocumentHealthIssue[]
  warnings: DocumentHealthIssue[]
}

function isGroup(el: EkoElement): el is GroupElement {
  return el.type === 'group'
}

/**
 * Document Health — read-only consistency audit.
 * Reports issues without mutating the document.
 */
export class DocumentHealth {
  static check(document: EkoDocument): DocumentHealthReport {
    const errors: DocumentHealthIssue[] = []
    const warnings: DocumentHealthIssue[] = []

    const push = (issue: DocumentHealthIssue) => {
      if (issue.severity === 'error') errors.push(issue)
      else warnings.push(issue)
    }

    if (!document.pages?.length) {
      push({
        code: 'missing_pages',
        message: 'Document has no pages',
        severity: 'error',
      })
    }

    if (!document.surfaces?.length) {
      push({
        code: 'missing_surfaces',
        message: 'Document has no surfaces',
        severity: 'error',
      })
    }

    const byId = new Map<string, EkoElement>()
    const seenIds = new Set<string>()

    for (const el of document.elements) {
      if (!el.id?.trim()) {
        push({
          code: 'missing_element_id',
          message: 'Element is missing id',
          severity: 'error',
        })
        continue
      }

      if (seenIds.has(el.id)) {
        push({
          code: 'duplicate_element_id',
          message: `Duplicate element id: ${el.id}`,
          severity: 'error',
          elementId: el.id,
        })
      }
      seenIds.add(el.id)
      byId.set(el.id, el)
    }

    for (const el of document.elements) {
      if (el.parentId && !byId.has(el.parentId)) {
        push({
          code: 'broken_parent_id',
          message: `Element ${el.id} references missing parent ${el.parentId}`,
          severity: 'error',
          elementId: el.id,
        })
      }
    }

    for (const el of document.elements) {
      if (!isGroup(el)) continue
      for (const childId of el.properties.childIds ?? []) {
        if (!byId.has(childId)) {
          push({
            code: 'group_missing_child',
            message: `Group ${el.id} references missing child ${childId}`,
            severity: 'error',
            elementId: el.id,
          })
        }
      }
    }

    const elementIdSet = new Set(document.elements.map((el) => el.id))
    for (const surface of document.surfaces ?? []) {
      for (const elementId of surface.elementIds) {
        if (!elementIdSet.has(elementId)) {
          push({
            code: 'surface_invalid_element_id',
            message: `Surface ${surface.id} references unknown element ${elementId}`,
            severity: 'error',
            elementId,
          })
        }
      }
    }

    const assetIds = new Set([
      ...document.assets.images.map((a) => a.id),
      ...document.assets.fonts.map((a) => a.id),
      ...document.assets.backgrounds.map((a) => a.id),
    ])

    for (const el of document.elements) {
      if (el.type !== 'image') continue
      const props = (el as ImageElement).properties
      if (props.assetId && !assetIds.has(props.assetId)) {
        push({
          code: 'missing_asset_reference',
          message: `Image ${el.id} references unknown asset ${props.assetId}`,
          severity: 'warning',
          elementId: el.id,
        })
      }
    }

    // Orphans: root elements not listed on any surface (raw document — no auto-fix).
    const claimed = new Set((document.surfaces ?? []).flatMap((s) => s.elementIds))
    for (const el of document.elements) {
      if (el.parentId) continue
      if (!claimed.has(el.id)) {
        push({
          code: 'orphan',
          message: `Orphan element ${el.id} is not assigned to any surface`,
          severity: 'warning',
          elementId: el.id,
        })
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }
}
