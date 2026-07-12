import { create } from 'zustand'
import { applyCommand } from '@/core/editor/commands'
import { historyEngine } from '@/core/history/HistoryEngine'
import { registerBuiltins } from '@/core/registry/registerBuiltins'
import { viewportManager } from '@/core/viewport/ViewportManager'
import { SAMPLE_MASTER_ID } from '@/data/sampleDocuments'
import { localDocumentProvider } from '@/providers/LocalDocumentProvider'
import { exportDocument, importDocument } from '@/services/documentService'
import type { EkoDocument } from '@/types/document'
import type { EkoElement } from '@/types/element'
import type { EditorCommand } from '@/types/history'
import type { ViewportState } from '@/types/viewport'

registerBuiltins()

interface EditorStore {
  document: EkoDocument | null
  selectedId: string | null
  viewport: ViewportState
  lastError: string | null
  isLoading: boolean

  bootstrapSession: (masterId?: string) => Promise<void>
  dispatch: (command: EditorCommand) => boolean
  selectElement: (elementId: string | null) => void
  moveElement: (elementId: string, x: number, y: number) => void
  resizeElement: (
    elementId: string,
    payload: { width: number; height: number; x?: number; y?: number; scaleX?: number; scaleY?: number },
  ) => void
  rotateElement: (elementId: string, rotation: number) => void
  updateElementProperties: (elementId: string, properties: Record<string, unknown>) => void
  setViewport: (viewport: ViewportState) => void
  fitViewport: () => void
  exportJson: () => string | null
  importJson: (json: string) => boolean
  getSelectedElement: () => EkoElement | null
  clearError: () => void
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  document: null,
  selectedId: null,
  viewport: viewportManager.getState(),
  lastError: null,
  isLoading: false,

  bootstrapSession: async (masterId = SAMPLE_MASTER_ID) => {
    set({ isLoading: true, lastError: null })
    try {
      const session = await localDocumentProvider.createSession(masterId)
      historyEngine.clear()
      set({
        document: session,
        selectedId: null,
        isLoading: false,
      })
      get().fitViewport()
    } catch (error) {
      set({
        isLoading: false,
        lastError: error instanceof Error ? error.message : 'Failed to bootstrap session',
      })
    }
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

    if (before && command.type !== 'SelectElement' && command.type !== 'LoadDocument') {
      historyEngine.push(command, before, result.document)
    }

    set({
      document: result.document,
      selectedId: result.selectedId !== undefined ? result.selectedId : get().selectedId,
      lastError: null,
    })
    return true
  },

  selectElement: (elementId) => {
    get().dispatch({ type: 'SelectElement', elementId, timestamp: Date.now() })
  },

  moveElement: (elementId, x, y) => {
    get().dispatch({ type: 'MoveElement', elementId, x, y, timestamp: Date.now() })
  },

  resizeElement: (elementId, payload) => {
    get().dispatch({ type: 'ResizeElement', elementId, ...payload, timestamp: Date.now() })
  },

  rotateElement: (elementId, rotation) => {
    get().dispatch({ type: 'RotateElement', elementId, rotation, timestamp: Date.now() })
  },

  updateElementProperties: (elementId, properties) => {
    get().dispatch({
      type: 'UpdateElementProperties',
      elementId,
      properties,
      timestamp: Date.now(),
    })
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
    const next = viewportManager.fitToStage(doc.canvas)
    set({ viewport: next })
  },

  exportJson: () => {
    const doc = get().document
    if (!doc) return null
    return exportDocument(doc)
  },

  importJson: (json) => {
    try {
      const doc = importDocument(json)
      historyEngine.clear()
      set({ document: doc, selectedId: null, lastError: null })
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

  clearError: () => set({ lastError: null }),
}))
