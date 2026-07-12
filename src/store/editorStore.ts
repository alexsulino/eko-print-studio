import { create } from 'zustand'
import { applyCommand } from '@/core/editor/commands'
import { historyEngine } from '@/core/history/HistoryEngine'
import { registerBuiltins } from '@/core/registry/registerBuiltins'
import { viewportManager } from '@/core/viewport/ViewportManager'
import { SelectionEngine } from '@/core/selection/SelectionEngine'
import { clipboardEngine } from '@/core/clipboard/ClipboardEngine'
import { SnappingEngine } from '@/core/snapping/SnappingEngine'
import { normalizeDocument } from '@/core/document/normalizeDocument'
import { elementLifecycle } from '@/core/document/elementLifecycle'
import { documentEvents, eventBus } from '@/core/events/EventBus'
import { PropertyEngine } from '@/core/properties/PropertyEngine'
import { LayoutResolver } from '@/core/layout'
import { SAMPLE_MASTER_ID } from '@/data/sampleDocuments'
import { localDocumentProvider } from '@/providers/LocalDocumentProvider'
import { exportDocument, importDocument } from '@/services/documentService'
import { templateRulesEngine } from '@/core/rules/TemplateRulesEngine'
import type { EkoDocument } from '@/types/document'
import type { EkoElement, ElementTransform } from '@/types/element'
import type { EditorCommand } from '@/types/history'
import type { ViewportState } from '@/types/viewport'
import {
  DEFAULT_INTERACTION_STATE,
  type InteractionState,
  type SnapGuide,
} from '@/types/interaction'

registerBuiltins()

/** Prevents overlapping StrictMode double-mount bootstraps. */
let bootstrapLock: Promise<void> | null = null
let bootstrapSeq = 0

const NON_HISTORY = new Set([
  'SelectElement',
  'SelectElements',
  'LoadDocument',
])

interface EditorStore {
  /** Document State */
  document: EkoDocument | null
  activePageId: string | null
  activeSurfaceId: string | null

  /** Selection State */
  selectedIds: string[]
  /** Primary selection (last focused) — used by properties panel. */
  selectedId: string | null

  /** Viewport State */
  viewport: ViewportState

  /** Interaction State (transient UI) */
  interaction: InteractionState

  lastError: string | null
  isLoading: boolean

  bootstrapSession: (masterId?: string) => Promise<void>
  dispatch: (command: EditorCommand) => boolean
  setActiveLayout: (pageId: string | null, surfaceId: string | null) => void

  selectElement: (elementId: string | null) => void
  selectElements: (elementIds: string[]) => void
  toggleSelect: (elementId: string) => void
  clearSelection: () => void

  moveElement: (elementId: string, x: number, y: number) => void
  moveElements: (moves: Array<{ elementId: string; x: number; y: number }>) => void
  resizeElement: (
    elementId: string,
    payload: { width: number; height: number; x?: number; y?: number; scaleX?: number; scaleY?: number },
  ) => void
  rotateElement: (elementId: string, rotation: number) => void
  transformElement: (elementId: string, transform: Partial<ElementTransform>) => void
  flipElement: (elementId: string, axis: 'horizontal' | 'vertical') => void
  updateElementProperties: (elementId: string, properties: Record<string, unknown>) => void
  updateProperty: (elementId: string, path: string, newValue: unknown) => boolean

  deleteSelected: () => void
  copySelected: () => void
  pasteClipboard: () => void
  duplicateSelected: () => void
  nudgeSelected: (dx: number, dy: number) => void
  selectAllSelectable: () => void
  cycleSelection: (direction: 1 | -1) => void

  undo: () => boolean
  redo: () => boolean

  setViewport: (viewport: ViewportState) => void
  fitViewport: () => void
  zoomIn: () => void
  zoomOut: () => void
  zoomTo100: () => void
  zoomAt: (nextZoom: number, screenX: number, screenY: number) => void
  panBy: (dx: number, dy: number) => void

  setInteraction: (patch: Partial<InteractionState>) => void
  setGuides: (guides: SnapGuide[]) => void
  clearGuides: () => void
  snapMove: (
    elementId: string,
    x: number,
    y: number,
  ) => { x: number; y: number; guides: SnapGuide[] }

  exportJson: () => string | null
  importJson: (json: string) => boolean
  getSelectedElement: () => EkoElement | null
  getSelectedElements: () => EkoElement[]
  clearError: () => void
}

function syncSelection(
  selectedIds: string[],
): Pick<EditorStore, 'selectedIds' | 'selectedId'> {
  return {
    selectedIds,
    selectedId: SelectionEngine.primary(selectedIds),
  }
}

function layoutIds(doc: EkoDocument): { activePageId: string | null; activeSurfaceId: string | null } {
  const normalized = normalizeDocument(doc)
  return {
    activePageId: normalized.pages?.[0]?.id ?? null,
    activeSurfaceId: normalized.surfaces?.[0]?.id ?? null,
  }
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  document: null,
  activePageId: null,
  activeSurfaceId: null,
  selectedIds: [],
  selectedId: null,
  viewport: viewportManager.getState(),
  interaction: { ...DEFAULT_INTERACTION_STATE },
  lastError: null,
  isLoading: false,

  bootstrapSession: async (masterId = SAMPLE_MASTER_ID) => {
    // Idempotent under React StrictMode double-invoke.
    if (get().document && !get().isLoading) return
    if (bootstrapLock) {
      await bootstrapLock
      return
    }

    const seq = ++bootstrapSeq
    bootstrapLock = (async () => {
      set({ isLoading: true, lastError: null })
      try {
        const session = normalizeDocument(await localDocumentProvider.createSession(masterId))
        if (seq !== bootstrapSeq) return

        historyEngine.clear()
        clipboardEngine.clear()
        elementLifecycle.clear()
        elementLifecycle.markLoaded(session.elements.map((el) => el.id))
        const layout = layoutIds(session)
        set({
          document: session,
          ...layout,
          ...syncSelection([]),
          interaction: { ...DEFAULT_INTERACTION_STATE },
          isLoading: false,
        })
        eventBus.emit(documentEvents.DOCUMENT_CHANGED, { documentId: session.id })
        eventBus.emit(documentEvents.LAYOUT_CHANGED, {
          pageId: layout.activePageId,
          surfaceId: layout.activeSurfaceId,
        })
        get().fitViewport()
      } catch (error) {
        if (seq !== bootstrapSeq) return
        set({
          isLoading: false,
          lastError: error instanceof Error ? error.message : 'Failed to bootstrap session',
        })
      }
    })()

    try {
      await bootstrapLock
    } finally {
      if (bootstrapLock) bootstrapLock = null
    }
  },

  setActiveLayout: (pageId, surfaceId) => {
    set({ activePageId: pageId, activeSurfaceId: surfaceId })
    eventBus.emit(documentEvents.LAYOUT_CHANGED, { pageId, surfaceId })
  },

  dispatch: (command) => {
    const current = get().document
    if (!current && command.type !== 'LoadDocument') {
      set({ lastError: 'No active document' })
      return false
    }

    const before = current
    const result = applyCommand(current ?? (command as { document: EkoDocument }).document, command)

    if (!result.success) {
      set({ lastError: result.reason ?? 'Command rejected' })
      return false
    }

    if (before && !NON_HISTORY.has(command.type)) {
      historyEngine.push(command, before, result.document)
    }

    const selectionPatch =
      result.selectedIds !== undefined
        ? syncSelection(result.selectedIds)
        : result.selectedId !== undefined
          ? syncSelection(result.selectedId ? [result.selectedId] : [])
          : {}

    const nextDoc = normalizeDocument(result.document)

    set({
      document: nextDoc,
      ...selectionPatch,
      lastError: null,
    })

    if (command.type === 'SelectElement' || command.type === 'SelectElements') {
      eventBus.emit(documentEvents.ELEMENT_SELECTED, {
        selectedIds: get().selectedIds,
      })
    } else if (command.type === 'DeleteElements') {
      eventBus.emit(documentEvents.ELEMENT_REMOVED, { elementIds: (command as { elementIds: string[] }).elementIds })
      eventBus.emit(documentEvents.DOCUMENT_CHANGED, { documentId: nextDoc.id })
    } else if (command.type === 'AddElements' || command.type === 'DuplicateElements') {
      eventBus.emit(documentEvents.ELEMENT_CREATED, { selectedIds: get().selectedIds })
      eventBus.emit(documentEvents.DOCUMENT_CHANGED, { documentId: nextDoc.id })
    } else if (!NON_HISTORY.has(command.type)) {
      eventBus.emit(documentEvents.ELEMENT_UPDATED, { type: command.type })
      eventBus.emit(documentEvents.DOCUMENT_CHANGED, { documentId: nextDoc.id })
    }

    return true
  },

  selectElement: (elementId) => {
    get().dispatch({ type: 'SelectElement', elementId, timestamp: Date.now() })
  },

  selectElements: (elementIds) => {
    get().dispatch({ type: 'SelectElements', elementIds, timestamp: Date.now() })
  },

  toggleSelect: (elementId) => {
    const next = SelectionEngine.toggle(get().selectedIds, elementId)
    get().selectElements(next)
  },

  clearSelection: () => {
    get().selectElements([])
  },

  moveElement: (elementId, x, y) => {
    get().dispatch({ type: 'MoveElement', elementId, x, y, timestamp: Date.now() })
  },

  moveElements: (moves) => {
    get().dispatch({ type: 'MoveElements', moves, timestamp: Date.now() })
  },

  resizeElement: (elementId, payload) => {
    get().dispatch({ type: 'ResizeElement', elementId, ...payload, timestamp: Date.now() })
  },

  rotateElement: (elementId, rotation) => {
    get().dispatch({ type: 'RotateElement', elementId, rotation, timestamp: Date.now() })
  },

  transformElement: (elementId, transform) => {
    get().dispatch({ type: 'TransformElement', elementId, transform, timestamp: Date.now() })
  },

  flipElement: (elementId, axis) => {
    get().dispatch({ type: 'FlipElement', elementId, axis, timestamp: Date.now() })
  },

  updateElementProperties: (elementId, properties) => {
    get().dispatch({
      type: 'UpdateElementProperties',
      elementId,
      properties,
      timestamp: Date.now(),
    })
  },

  updateProperty: (elementId, path, newValue) => {
    const doc = get().document
    if (!doc) return false
    const prepared = PropertyEngine.createUpdateCommand(doc, elementId, path, newValue)
    if (!prepared.success) {
      set({ lastError: prepared.reason })
      return false
    }
    return get().dispatch(prepared.command)
  },

  deleteSelected: () => {
    const ids = get().selectedIds
    if (!ids.length) return
    get().dispatch({ type: 'DeleteElements', elementIds: ids, timestamp: Date.now() })
  },

  copySelected: () => {
    const elements = get().getSelectedElements()
    if (!elements.length) return
    clipboardEngine.copy(elements)
  },

  pasteClipboard: () => {
    const clones = clipboardEngine.paste()
    if (!clones.length) return
    get().dispatch({ type: 'AddElements', elements: clones, timestamp: Date.now() })
  },

  duplicateSelected: () => {
    const ids = get().selectedIds
    if (!ids.length) return
    get().dispatch({ type: 'DuplicateElements', elementIds: ids, timestamp: Date.now() })
  },

  nudgeSelected: (dx, dy) => {
    const doc = get().document
    const ids = get().selectedIds
    if (!doc || !ids.length) return
    const moves = ids
      .map((id) => {
        const el = doc.elements.find((item) => item.id === id)
        if (!el) return null
        if (!templateRulesEngine.can(el, 'move', doc).allowed) return null
        return { elementId: id, x: el.transform.x + dx, y: el.transform.y + dy }
      })
      .filter((m): m is { elementId: string; x: number; y: number } => Boolean(m))
    if (!moves.length) return
    get().moveElements(moves)
  },

  selectAllSelectable: () => {
    const doc = get().document
    if (!doc) return
    const ids = doc.elements
      .filter((el) => templateRulesEngine.can(el, 'select', doc).allowed)
      .map((el) => el.id)
    get().selectElements(ids)
  },

  cycleSelection: (direction) => {
    const doc = get().document
    if (!doc) return
    const selectable = doc.elements
      .filter((el) => templateRulesEngine.can(el, 'select', doc).allowed)
      .map((el) => el.id)
    const next = SelectionEngine.cycle(selectable, get().selectedIds, direction)
    get().selectElements(next)
  },

  undo: () => {
    const before = historyEngine.peekUndoBefore()
    if (!before) return false
    historyEngine.undo()
    set({
      document: structuredClone(before),
      lastError: null,
    })
    return true
  },

  redo: () => {
    const after = historyEngine.peekRedoAfter()
    if (!after) return false
    historyEngine.redo()
    set({
      document: structuredClone(after),
      lastError: null,
    })
    return true
  },

  setViewport: (viewport) => {
    viewportManager.setZoom(viewport.zoom)
    viewportManager.setPan(viewport.panX, viewport.panY)
    viewportManager.setStageSize(viewport.stageWidth, viewport.stageHeight)
    set({ viewport: viewportManager.getState() })
  },

  fitViewport: () => {
    const doc = get().document
    if (!doc) return
    const layout = LayoutResolver.resolve(doc, {
      pageId: get().activePageId,
      surfaceId: get().activeSurfaceId,
    })
    const next = viewportManager.fitToPixels(layout.paper.widthPx, layout.paper.heightPx)
    set({ viewport: next })
  },

  zoomIn: () => {
    set({ viewport: viewportManager.zoomIn() })
  },

  zoomOut: () => {
    set({ viewport: viewportManager.zoomOut() })
  },

  zoomTo100: () => {
    const doc = get().document
    set({ viewport: viewportManager.zoomTo100(doc?.canvas) })
  },

  zoomAt: (nextZoom, screenX, screenY) => {
    set({ viewport: viewportManager.zoomAt(nextZoom, screenX, screenY) })
  },

  panBy: (dx, dy) => {
    viewportManager.panBy(dx, dy)
    set({ viewport: viewportManager.getState() })
  },

  setInteraction: (patch) => {
    set({ interaction: { ...get().interaction, ...patch } })
  },

  setGuides: (guides) => {
    set({ interaction: { ...get().interaction, guides } })
  },

  clearGuides: () => {
    set({ interaction: { ...get().interaction, guides: [], mode: 'idle' } })
  },

  snapMove: (elementId, x, y) => {
    const doc = get().document
    const { interaction } = get()
    if (!doc || !interaction.snap.enabled) {
      return { x, y, guides: [] }
    }
    const el = doc.elements.find((item) => item.id === elementId)
    if (!el) return { x, y, guides: [] }

    const targets = SnappingEngine.collectTargets(doc, [elementId], interaction.snap)
    const result = SnappingEngine.snapBox(
      {
        id: elementId,
        x,
        y,
        width: Math.abs(el.transform.width * el.transform.scaleX),
        height: Math.abs(el.transform.height * el.transform.scaleY),
      },
      targets,
      interaction.snap,
    )
    return result
  },

  exportJson: () => {
    const doc = get().document
    if (!doc) return null
    return exportDocument(doc)
  },

  importJson: (json) => {
    try {
      const doc = normalizeDocument(importDocument(json))
      historyEngine.clear()
      elementLifecycle.markLoaded(doc.elements.map((el) => el.id))
      set({
        document: doc,
        ...layoutIds(doc),
        ...syncSelection([]),
        lastError: null,
      })
      eventBus.emit(documentEvents.DOCUMENT_CHANGED, { documentId: doc.id })
      eventBus.emit(documentEvents.LAYOUT_CHANGED, {
        pageId: get().activePageId,
        surfaceId: get().activeSurfaceId,
      })
      get().fitViewport()
      return true
    } catch (error) {
      set({
        lastError: error instanceof Error ? error.message : 'Invalid JSON document',
      })
      return false
    }
  },

  getSelectedElement: () => {
    const { document: doc, selectedId } = get()
    if (!doc || !selectedId) return null
    return doc.elements.find((el) => el.id === selectedId) ?? null
  },

  getSelectedElements: () => {
    const { document: doc, selectedIds } = get()
    if (!doc) return []
    return selectedIds
      .map((id) => doc.elements.find((el) => el.id === id))
      .filter((el): el is EkoElement => Boolean(el))
  },

  clearError: () => set({ lastError: null }),
}))
