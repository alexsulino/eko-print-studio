import { create } from 'zustand'
import { applyCommand } from '@/core/editor/commands'
import { historyEngine } from '@/core/history/HistoryEngine'
import { registerBuiltins } from '@/core/registry/registerBuiltins'
import { viewportManager } from '@/core/viewport/ViewportManager'
import { SelectionEngine } from '@/core/selection/SelectionEngine'
import { clipboardEngine } from '@/core/clipboard/ClipboardEngine'
import { SnappingEngine } from '@/core/snapping/SnappingEngine'
import { AlignmentGuides } from '@/core/alignment/AlignmentGuides'
import { guidesEngine } from '@/core/guides/GuidesEngine'
import { WorkspaceEngine } from '@/core/workspace/WorkspaceEngine'
import { GridEngine } from '@/core/grid/GridEngine'
import { DEFAULT_WORKSPACE_STATE, type WorkspaceState } from '@/types/workspace'
import { DEFAULT_GRID_CONFIG, type GridConfig } from '@/types/grid'
import { normalizeDocument } from '@/core/document/normalizeDocument'
import { elementLifecycle } from '@/core/document/elementLifecycle'
import { documentEvents, eventBus, platformEvents } from '@/core/events/EventBus'
import { PropertyEngine } from '@/core/properties/PropertyEngine'
import { LayoutResolver } from '@/core/layout'
import { SAMPLE_MASTER_ID } from '@/data/sampleDocuments'
import { localDocumentProvider } from '@/providers/LocalDocumentProvider'
import { exportDocument, importDocument } from '@/services/documentService'
import { templateRulesEngine } from '@/core/rules/TemplateRulesEngine'
import { reconcileActiveLayout } from '@/core/pages/pageMutations'
import { getDocumentPixelSize } from '@/core/document/units'
import type { EkoDocument } from '@/types/document'
import type { EkoElement, ElementTransform } from '@/types/element'
import type { EditorCommand } from '@/types/history'
import type { ViewportState } from '@/types/viewport'
import {
  DEFAULT_INTERACTION_STATE,
  IDLE_INTERACTION_SESSION,
  type AlignMode,
  type DistributeMode,
  type InteractionState,
  type InteractionSession,
  type SnapGuide,
} from '@/types/interaction'
import { recordPropertyUpdateMs } from '@/diagnostics/runtimeBenchmark'
import { recordCommand, recordZustandUpdate } from '@/diagnostics/dragProfiler'

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

  /** Infinite pasteboard (pages placed in world space — no element knowledge). */
  workspace: WorkspaceState

  /** Document grid overlay / snap config. */
  grid: GridConfig

  /** Interaction State (transient UI) */
  interaction: InteractionState

  lastError: string | null
  isLoading: boolean

  bootstrapSession: (masterId?: string) => Promise<void>
  dispatch: (command: EditorCommand) => boolean
  setActiveLayout: (pageId: string | null, surfaceId: string | null) => void
  /** Switch active page — clears selection and fits viewport. */
  activatePage: (pageId: string) => boolean
  addPage: (name?: string) => boolean
  duplicatePage: (pageId?: string) => boolean
  deletePage: (pageId?: string) => boolean
  reorderPages: (orderedIds: string[]) => boolean
  rebuildWorkspace: () => void
  setGrid: (patch: Partial<GridConfig>) => void
  fitWorkspace: (smooth?: boolean) => void
  insertAsset: (payload: {
    assetId: string
    libraryKind: 'image' | 'svg' | 'template'
    sourceUri: string
    name: string
    mimeType?: string
  }) => boolean

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
  transformElements: (
    transforms: Array<{ elementId: string; transform: Partial<ElementTransform> }>,
  ) => void
  flipElement: (elementId: string, axis: 'horizontal' | 'vertical') => void
  flipSelected: (axis: 'horizontal' | 'vertical') => void
  alignSelected: (mode: AlignMode) => void
  distributeSelected: (mode: DistributeMode) => void
  updateElementProperties: (elementId: string, properties: Record<string, unknown>) => void
  updateProperty: (elementId: string, path: string, newValue: unknown) => boolean

  deleteSelected: () => void
  copySelected: () => void
  cutSelected: () => void
  pasteClipboard: () => void
  duplicateSelected: () => void
  nudgeSelected: (dx: number, dy: number) => void
  selectAllSelectable: () => void
  cycleSelection: (direction: 1 | -1) => void

  undo: () => boolean
  redo: () => boolean

  setViewport: (viewport: ViewportState) => void
  fitViewport: (smooth?: boolean) => void
  zoomToSelection: (smooth?: boolean) => void
  zoomIn: () => void
  zoomOut: () => void
  zoomTo100: () => void
  zoomAt: (nextZoom: number, screenX: number, screenY: number) => void
  zoomAtToggle: (screenX: number, screenY: number) => void
  panBy: (dx: number, dy: number) => void

  setInteraction: (patch: Partial<InteractionState>) => void
  setHoveredId: (id: string | null) => void
  setGuides: (guides: SnapGuide[]) => void
  clearGuides: () => void
  /** Start a modal interaction session (text edit, crop, …). */
  beginInteractionSession: (
    session: Omit<InteractionSession, 'kind'> & {
      kind: Exclude<InteractionSession['kind'], 'none'>
    },
  ) => boolean
  endInteractionSession: () => void
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

function syncWorkspace(
  document: EkoDocument,
  activePageId: string | null,
  config?: WorkspaceState['config'],
): WorkspaceState {
  return WorkspaceEngine.layoutPages(
    document,
    config ?? DEFAULT_WORKSPACE_STATE.config,
    activePageId,
  )
}

function hydrateGuides(document: EkoDocument): void {
  guidesEngine.hydrateFromDocument(document.guides)
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  document: null,
  activePageId: null,
  activeSurfaceId: null,
  selectedIds: [],
  selectedId: null,
  viewport: viewportManager.getState(),
  workspace: { ...DEFAULT_WORKSPACE_STATE },
  grid: { ...DEFAULT_GRID_CONFIG },
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
        hydrateGuides(session)
        const workspace = syncWorkspace(session, layout.activePageId)
        set({
          document: session,
          ...layout,
          ...syncSelection([]),
          workspace,
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
    eventBus.emit(platformEvents.PageChanged, { pageId, surfaceId })
  },

  activatePage: (pageId) => {
    const doc = get().document
    if (!doc) return false
    const page = doc.pages?.find((p) => p.id === pageId)
    if (!page) return false

    const surfaceId =
      page.surfaceIds?.[0] ??
      doc.surfaces?.find((s) => s.pageId === pageId)?.id ??
      null

    set({
      activePageId: pageId,
      activeSurfaceId: surfaceId,
      workspace: syncWorkspace(doc, pageId, get().workspace.config),
      ...syncSelection([]),
    })
    eventBus.emit(documentEvents.LAYOUT_CHANGED, { pageId, surfaceId })
    eventBus.emit(platformEvents.PageChanged, { pageId, surfaceId })
    get().fitViewport()
    return true
  },

  addPage: (name) => {
    const ok = get().dispatch({ type: 'AddPage', name, timestamp: Date.now() })
    if (!ok) return false
    const pages = get().document?.pages ?? []
    const created = pages[pages.length - 1]
    if (created) get().activatePage(created.id)
    return true
  },

  duplicatePage: (pageId) => {
    const id = pageId ?? get().activePageId
    if (!id) return false
    const beforeCount = get().document?.pages?.length ?? 0
    const ok = get().dispatch({ type: 'DuplicatePage', pageId: id, timestamp: Date.now() })
    if (!ok) return false
    const pages = get().document?.pages ?? []
    if (pages.length > beforeCount) {
      const created = pages[pages.length - 1]
      if (created) get().activatePage(created.id)
    }
    return true
  },

  deletePage: (pageId) => {
    const id = pageId ?? get().activePageId
    if (!id) return false
    const ok = get().dispatch({ type: 'DeletePage', pageId: id, timestamp: Date.now() })
    if (!ok) return false
    const doc = get().document
    if (!doc) return false
    const layout = reconcileActiveLayout(doc, get().activePageId, get().activeSurfaceId)
    set({
      ...layout,
      workspace: syncWorkspace(doc, layout.activePageId, get().workspace.config),
      ...syncSelection([]),
    })
    get().fitViewport()
    return true
  },

  reorderPages: (orderedIds) => {
    const ok = get().dispatch({ type: 'ReorderPages', orderedIds, timestamp: Date.now() })
    if (!ok) return false
    get().rebuildWorkspace()
    return true
  },

  rebuildWorkspace: () => {
    const doc = get().document
    if (!doc) return
    set({
      workspace: syncWorkspace(doc, get().activePageId, get().workspace.config),
    })
  },

  setGrid: (patch) => {
    const grid = GridEngine.create({ ...get().grid, ...patch })
    const snapPatch =
      grid.snap && grid.enabled
        ? {
            snap: {
              ...get().interaction.snap,
              grid: true,
              gridSizePx: grid.sizePx / Math.max(1, grid.subdivisions),
            },
          }
        : {
            snap: {
              ...get().interaction.snap,
              grid: false,
            },
          }
    set({
      grid,
      interaction: { ...get().interaction, ...snapPatch },
    })
  },

  fitWorkspace: (smooth = true) => {
    const { workspace, viewport } = get()
    const target = WorkspaceEngine.fitWorkspace(
      workspace,
      viewport.stageWidth,
      viewport.stageHeight,
    )
    if (!smooth) {
      viewportManager.setZoom(target.zoom)
      viewportManager.setPan(target.panX, target.panY)
      set({ viewport: viewportManager.getState() })
      return
    }
    viewportManager.animateTo(target, (next) => set({ viewport: next }))
  },

  insertAsset: (payload) => {
    const surfaceId = get().activeSurfaceId
    if (!surfaceId) {
      set({ lastError: 'No active surface' })
      return false
    }
    return get().dispatch({
      type: 'InsertAsset',
      assetId: payload.assetId,
      libraryKind: payload.libraryKind,
      sourceUri: payload.sourceUri,
      name: payload.name,
      mimeType: payload.mimeType,
      surfaceId,
      timestamp: Date.now(),
    })
  },

  dispatch: (command) => {
    recordCommand(command.type)
    const current = get().document
    if (!current && command.type !== 'LoadDocument') {
      set({ lastError: 'No active document' })
      return false
    }

    const propertyStarted =
      import.meta.env.DEV &&
      (command.type === 'UpdateElementProperties' || command.type === 'UpdateProperty')
        ? performance.now()
        : null

    const before = current
    const result = applyCommand(current ?? (command as { document: EkoDocument }).document, command)

    if (!result.success) {
      set({ lastError: result.reason ?? 'Command rejected' })
      return false
    }

    if (before && !NON_HISTORY.has(command.type)) {
      historyEngine.push(command, before, result.document)
    }

    const selectionPatch: Partial<Pick<EditorStore, 'selectedIds' | 'selectedId'>> =
      result.selectedIds !== undefined
        ? syncSelection(result.selectedIds)
        : result.selectedId !== undefined
          ? syncSelection(result.selectedId ? [result.selectedId] : [])
          : {}

    const nextDoc = normalizeDocument(result.document)
    const pageCommands = new Set(['AddPage', 'DuplicatePage', 'DeletePage', 'ReorderPages', 'LoadDocument'])
    const workspace =
      pageCommands.has(command.type) || !get().workspace.placements.length
        ? syncWorkspace(nextDoc, get().activePageId, get().workspace.config)
        : get().workspace

    if (command.type === 'LoadDocument') {
      hydrateGuides(nextDoc)
    }

    recordZustandUpdate([
      'document',
      ...(selectionPatch.selectedIds !== undefined ? ['selectedIds', 'selectedId'] : []),
    ])

    set({
      document: nextDoc,
      workspace,
      ...selectionPatch,
      lastError: null,
    })

    if (propertyStarted !== null) {
      recordPropertyUpdateMs(performance.now() - propertyStarted)
    }

    if (command.type === 'SelectElement' || command.type === 'SelectElements') {
      eventBus.emit(documentEvents.ELEMENT_SELECTED, {
        selectedIds: get().selectedIds,
      })
      eventBus.emit(platformEvents.SelectionChanged, {
        selectedIds: get().selectedIds,
      })
    } else if (command.type === 'DeleteElements') {
      eventBus.emit(documentEvents.ELEMENT_REMOVED, { elementIds: (command as { elementIds: string[] }).elementIds })
      eventBus.emit(documentEvents.DOCUMENT_CHANGED, { documentId: nextDoc.id })
    } else if (
      command.type === 'AddElements' ||
      command.type === 'DuplicateElements' ||
      command.type === 'InsertAsset'
    ) {
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

  transformElements: (transforms) => {
    if (!transforms.length) return
    get().dispatch({ type: 'TransformElements', transforms, timestamp: Date.now() })
  },

  flipElement: (elementId, axis) => {
    get().dispatch({ type: 'FlipElement', elementId, axis, timestamp: Date.now() })
  },

  flipSelected: (axis) => {
    const ids = get().selectedIds
    if (!ids.length) return
    if (ids.length === 1) {
      get().flipElement(ids[0]!, axis)
      return
    }
    get().dispatch({ type: 'FlipElements', elementIds: ids, axis, timestamp: Date.now() })
  },

  alignSelected: (mode) => {
    const doc = get().document
    const elements = get().getSelectedElements()
    if (!doc || !elements.length) return
    const page =
      elements.length === 1
        ? (() => {
            const { widthPx, heightPx } = getDocumentPixelSize(doc.canvas)
            return { x: 0, y: 0, width: widthPx, height: heightPx }
          })()
        : null
    const moves = AlignmentGuides.align(elements, mode, page).filter((move) => {
      const el = doc.elements.find((item) => item.id === move.elementId)
      return el ? templateRulesEngine.can(el, 'move', doc).allowed : false
    })
    if (!moves.length) return
    get().moveElements(moves)
  },

  distributeSelected: (mode) => {
    const doc = get().document
    const elements = get().getSelectedElements()
    if (!doc || elements.length < 3) return
    const moves = AlignmentGuides.distribute(elements, mode).filter((move) => {
      const el = doc.elements.find((item) => item.id === move.elementId)
      return el ? templateRulesEngine.can(el, 'move', doc).allowed : false
    })
    if (!moves.length) return
    get().moveElements(moves)
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

  cutSelected: () => {
    const elements = get().getSelectedElements()
    if (!elements.length) return
    clipboardEngine.cut(elements)
    get().deleteSelected()
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
    const doc = structuredClone(before)
    const prevPageId = get().activePageId
    const layout = reconcileActiveLayout(doc, get().activePageId, get().activeSurfaceId)
    set({
      document: doc,
      ...layout,
      workspace: syncWorkspace(doc, layout.activePageId, get().workspace.config),
      ...(layout.activePageId !== prevPageId ? syncSelection([]) : {}),
      lastError: null,
    })
    if (layout.activePageId !== prevPageId) get().fitViewport()
    return true
  },

  redo: () => {
    const after = historyEngine.peekRedoAfter()
    if (!after) return false
    historyEngine.redo()
    const doc = structuredClone(after)
    const prevPageId = get().activePageId
    const layout = reconcileActiveLayout(doc, get().activePageId, get().activeSurfaceId)
    set({
      document: doc,
      ...layout,
      workspace: syncWorkspace(doc, layout.activePageId, get().workspace.config),
      ...(layout.activePageId !== prevPageId ? syncSelection([]) : {}),
      lastError: null,
    })
    if (layout.activePageId !== prevPageId) get().fitViewport()
    return true
  },

  setViewport: (viewport) => {
    const prevZoom = get().viewport.zoom
    viewportManager.setZoom(viewport.zoom)
    viewportManager.setPan(viewport.panX, viewport.panY)
    viewportManager.setStageSize(viewport.stageWidth, viewport.stageHeight)
    const next = viewportManager.getState()
    set({ viewport: next })
    if (next.zoom !== prevZoom) {
      eventBus.emit(platformEvents.ZoomChanged, { zoom: next.zoom })
    }
  },

  fitViewport: (smooth = true) => {
    const doc = get().document
    if (!doc) return
    const layout = LayoutResolver.resolve(doc, {
      pageId: get().activePageId,
      surfaceId: get().activeSurfaceId,
    })
    if (!smooth) {
      const next = viewportManager.fitToPixels(layout.paper.widthPx, layout.paper.heightPx)
      set({ viewport: next })
      return
    }
    const target = viewportManager.computeFitToPixels(
      layout.paper.widthPx,
      layout.paper.heightPx,
    )
    viewportManager.animateTo(target, (viewport) => set({ viewport }))
  },

  zoomToSelection: (smooth = true) => {
    const elements = get().getSelectedElements()
    const bounds = AlignmentGuides.selectionBounds(elements)
    if (!bounds) {
      get().fitViewport(smooth)
      return
    }
    if (!smooth) {
      set({ viewport: viewportManager.fitToBounds(bounds) })
      return
    }
    const target = viewportManager.computeFitToBounds(bounds)
    viewportManager.animateTo(target, (viewport) => set({ viewport }))
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

  zoomAtToggle: (screenX, screenY) => {
    const target = viewportManager.computeZoomAtToggle(screenX, screenY)
    viewportManager.animateTo(target, (viewport) => set({ viewport }), 160)
  },

  panBy: (dx, dy) => {
    viewportManager.panBy(dx, dy)
    set({ viewport: viewportManager.getState() })
  },

  setInteraction: (patch) => {
    recordZustandUpdate(['interaction', ...Object.keys(patch)])
    set({ interaction: { ...get().interaction, ...patch } })
  },

  setHoveredId: (id) => {
    const current = get().interaction
    if (current.hoveredId === id) return
    const mode =
      current.mode === 'idle' || current.mode === 'hover'
        ? id
          ? 'hover'
          : 'idle'
        : current.mode
    recordZustandUpdate(['interaction', 'hoveredId'])
    set({ interaction: { ...current, hoveredId: id, mode } })
  },

  setGuides: (guides) => {
    recordZustandUpdate(['interaction', 'guides'])
    set({ interaction: { ...get().interaction, guides } })
  },

  clearGuides: () => {
    recordZustandUpdate(['interaction', 'guides', 'mode'])
    set({ interaction: { ...get().interaction, guides: [], mode: 'idle' } })
  },

  beginInteractionSession: (session) => {
    const doc = get().document
    if (!doc || !session.elementId) return false
    const el = doc.elements.find((item) => item.id === session.elementId)
    if (!el) return false

    if (session.kind === 'textEdit') {
      if (el.type !== 'text') return false
      const allowed = templateRulesEngine.can(el, 'changeText', doc).allowed
      if (!allowed) {
        set({ lastError: 'Text editing is not allowed for this element' })
        return false
      }
    }

    set({
      ...syncSelection([session.elementId]),
      interaction: {
        ...get().interaction,
        session: {
          kind: session.kind,
          elementId: session.elementId,
          meta: session.meta,
        },
        mode: 'editing',
        marquee: null,
        guides: [],
        hoveredId: null,
      },
      lastError: null,
    })
    return true
  },

  endInteractionSession: () => {
    set({
      interaction: {
        ...get().interaction,
        session: { ...IDLE_INTERACTION_SESSION },
        mode: 'idle',
      },
    })
  },

  snapMove: (elementId, x, y) => {
    const doc = get().document
    const { interaction, selectedIds } = get()
    if (!doc || !interaction.snap.enabled) {
      return { x, y, guides: [] }
    }
    const el = doc.elements.find((item) => item.id === elementId)
    if (!el) return { x, y, guides: [] }

    const movingIds = selectedIds.includes(elementId) ? selectedIds : [elementId]
    const targets = SnappingEngine.collectTargets(doc, movingIds, interaction.snap, {
      persistentGuides: interaction.snap.persistentGuides
        ? guidesEngine
            .snapTargets(get().activePageId)
            .map((t) => ({
              id: t.id,
              orientation: t.orientation,
              position: t.position,
              label: undefined,
              locked: false,
              visible: true,
            }))
        : [],
    })
    const box = {
      id: elementId,
      x,
      y,
      width: Math.abs(el.transform.width * el.transform.scaleX),
      height: Math.abs(el.transform.height * el.transform.scaleY),
    }
    const result = SnappingEngine.snapBox(box, targets, interaction.snap)
    const others = doc.elements
      .filter((item) => item.visible && !movingIds.includes(item.id))
      .map((item) => ({
        id: item.id,
        x: item.transform.x,
        y: item.transform.y,
        width: Math.abs(item.transform.width * item.transform.scaleX),
        height: Math.abs(item.transform.height * item.transform.scaleY),
      }))
    const spacing = SnappingEngine.detectSpacingGuides(
      { ...box, x: result.x, y: result.y },
      others,
      interaction.snap.thresholdPx,
    )
    return { ...result, guides: [...result.guides, ...spacing] }
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
      const layout = layoutIds(doc)
      hydrateGuides(doc)
      set({
        document: doc,
        ...layout,
        workspace: syncWorkspace(doc, layout.activePageId, get().workspace.config),
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
