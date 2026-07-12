import type { EkoDocument } from '@/types/document'
import type { EkoElement, GroupElement } from '@/types/element'
import type { OwnershipResolution } from '@/core/documentGraph/ownership'
import { normalizeDocument } from '@/core/document/normalizeDocument'

export interface GraphNode {
  id: string
  kind: 'document' | 'page' | 'surface' | 'region' | 'group' | 'element'
  name: string
  parentId: string | null
  childIds: string[]
  element?: EkoElement
  zIndex?: number
}

export interface GraphValidationIssue {
  code: 'orphan' | 'missing_ref' | 'duplicate' | 'cycle' | 'invalid_parent'
  message: string
  elementId?: string
}

export interface DocumentGraphSnapshot {
  nodes: Map<string, GraphNode>
  roots: string[]
  issues: GraphValidationIssue[]
}

function isGroup(el: EkoElement): el is GroupElement {
  return el.type === 'group'
}

/**
 * DocumentGraph — hierarchical view over the flat EkoDocument element list.
 */
export class DocumentGraph {
  static build(document: EkoDocument): DocumentGraphSnapshot {
    const doc = normalizeDocument(document)
    const nodes = new Map<string, GraphNode>()
    const issues: GraphValidationIssue[] = []
    const seen = new Set<string>()

    nodes.set(doc.id, {
      id: doc.id,
      kind: 'document',
      name: doc.metadata.name,
      parentId: null,
      childIds: (doc.pages ?? []).map((p) => p.id),
    })

    for (const page of doc.pages ?? []) {
      nodes.set(page.id, {
        id: page.id,
        kind: 'page',
        name: page.name,
        parentId: doc.id,
        childIds: [...(page.surfaceIds ?? [])],
      })
    }

    for (const surface of doc.surfaces ?? []) {
      nodes.set(surface.id, {
        id: surface.id,
        kind: 'surface',
        name: surface.name,
        parentId: surface.pageId ?? doc.id,
        childIds: [],
      })
      const page = surface.pageId ? nodes.get(surface.pageId) : null
      if (page && !page.childIds.includes(surface.id)) {
        page.childIds.push(surface.id)
      }
    }

    const byId = new Map(doc.elements.map((el) => [el.id, el]))

    for (const el of doc.elements) {
      if (seen.has(el.id)) {
        issues.push({ code: 'duplicate', message: `Duplicate element id ${el.id}`, elementId: el.id })
        continue
      }
      seen.add(el.id)

      if (el.parentId && !byId.has(el.parentId)) {
        issues.push({
          code: 'missing_ref',
          message: `Element ${el.id} parentId ${el.parentId} not found`,
          elementId: el.id,
        })
      }

      nodes.set(el.id, {
        id: el.id,
        kind: isGroup(el) ? 'group' : 'element',
        name: el.name ?? el.slug ?? el.id,
        parentId: el.parentId ?? null,
        childIds: isGroup(el) ? [...el.properties.childIds] : [],
        element: el,
        zIndex: el.zIndex,
      })
    }

    // Attach root elements (no parent) to their surface node.
    for (const surface of doc.surfaces ?? []) {
      const surfaceNode = nodes.get(surface.id)
      if (!surfaceNode) continue
      const ordered = surface.elementIds
        .map((id) => byId.get(id))
        .filter((el): el is EkoElement => Boolean(el))
        .filter((el) => !el.parentId)
        .sort((a, b) => a.zIndex - b.zIndex)
      surfaceNode.childIds = ordered.map((el) => el.id)
      for (const el of ordered) {
        const node = nodes.get(el.id)
        if (node && !node.parentId) node.parentId = surface.id
      }
    }

    // Validate group child refs + cycles
    for (const el of doc.elements) {
      if (!isGroup(el)) continue
      for (const childId of el.properties.childIds) {
        if (!byId.has(childId)) {
          issues.push({
            code: 'missing_ref',
            message: `Group ${el.id} references missing child ${childId}`,
            elementId: el.id,
          })
        }
      }
      if (DocumentGraph.detectCycle(el.id, byId)) {
        issues.push({ code: 'cycle', message: `Cycle detected at group ${el.id}`, elementId: el.id })
      }
    }

    const claimed = new Set((doc.surfaces ?? []).flatMap((s) => s.elementIds))
    for (const el of doc.elements) {
      if (!el.parentId && !claimed.has(el.id)) {
        issues.push({ code: 'orphan', message: `Orphan element ${el.id}`, elementId: el.id })
      }
    }

    return {
      nodes,
      roots: [doc.id],
      issues,
    }
  }

  static validate(document: EkoDocument): GraphValidationIssue[] {
    return DocumentGraph.build(document).issues
  }

  static getParent(document: EkoDocument, elementId: string): GraphNode | null {
    const graph = DocumentGraph.build(document)
    const node = graph.nodes.get(elementId)
    if (!node?.parentId) return null
    return graph.nodes.get(node.parentId) ?? null
  }

  static getChildren(document: EkoDocument, nodeId: string): GraphNode[] {
    const graph = DocumentGraph.build(document)
    const node = graph.nodes.get(nodeId)
    if (!node) return []
    return node.childIds
      .map((id) => graph.nodes.get(id))
      .filter((n): n is GraphNode => Boolean(n))
  }

  static getAncestors(document: EkoDocument, elementId: string): GraphNode[] {
    const graph = DocumentGraph.build(document)
    const result: GraphNode[] = []
    let current = graph.nodes.get(elementId)
    const guard = new Set<string>()
    while (current?.parentId && !guard.has(current.parentId)) {
      guard.add(current.parentId)
      const parent = graph.nodes.get(current.parentId)
      if (!parent) break
      result.push(parent)
      current = parent
    }
    return result
  }

  static resolveOwnership(document: EkoDocument, elementId: string): OwnershipResolution | null {
    const doc = normalizeDocument(document)
    const el = doc.elements.find((item) => item.id === elementId)
    if (!el) return null

    const surface =
      doc.surfaces?.find((s) => s.elementIds.includes(elementId)) ??
      doc.surfaces?.find((s) => s.id === el.surfaceId) ??
      null

    return {
      elementId,
      container: el.parentId ? 'group' : surface ? 'surface' : 'document',
      containerId: el.parentId ?? surface?.id ?? doc.id,
      pageId: surface?.pageId ?? null,
      surfaceId: surface?.id ?? el.surfaceId ?? null,
      regionId: el.regionId ?? null,
      parentId: el.parentId ?? null,
    }
  }

  private static detectCycle(startId: string, byId: Map<string, EkoElement>): boolean {
    const visiting = new Set<string>()
    const visit = (id: string): boolean => {
      if (visiting.has(id)) return true
      visiting.add(id)
      const el = byId.get(id)
      if (el && isGroup(el)) {
        for (const childId of el.properties.childIds) {
          if (visit(childId)) return true
        }
      }
      visiting.delete(id)
      return false
    }
    return visit(startId)
  }
}
