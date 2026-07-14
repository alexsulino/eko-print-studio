import type { EkoDocument } from '@/types/document'
import type { EkoElement, ElementType, ObjectCapabilities } from '@/types/element'
import type { EditorCommand } from '@/types/history'
import type { PropertyDescriptor } from '@/types/properties'
import type { ViewportState } from '@/types/viewport'
import type { GridConfig } from '@/types/grid'
import type { WorkspaceState } from '@/types/workspace'
import { PROPERTY_GROUPS } from '@/types/properties'
import { PropertyEngine } from '@/core/properties/PropertyEngine'
import { objectRegistry } from '@/core/registry/ObjectRegistry'
import { LayerEngine } from '@/core/layers/LayerEngine'
import type { LayerListItem } from '@/core/layers/LayerEngine'
import { listDocumentLibraryAssets } from '@/core/assets/libraryAssets'
import type { LibraryAssetEntry } from '@/core/assets/libraryAssets'
import { guidesEngine } from '@/core/guides/GuidesEngine'
import { historyEngine } from '@/core/history/HistoryEngine'
import { eventBus, platformEvents } from '@/core/events/EventBus'
import { ObjectFactory } from '@/core/objects/ObjectFactory'
import { SelectionEngine } from '@/core/selection/SelectionEngine'
import { useEditorStore } from '@/store/editorStore'
import { downloadDocumentJson } from '@/services/documentService'
import { localDocumentProvider } from '@/providers/LocalDocumentProvider'

/**
 * Public editor session snapshot for UI (SDK boundary).
 * UI reads this — never reaches into the store or Core.
 */
export interface EditorSnapshot {
  document: EkoDocument | null
  selectedIds: string[]
  selectedId: string | null
  hoverId: string | null
  viewport: ViewportState
  workspace: WorkspaceState
  grid: GridConfig
  guidesVisible: boolean
  activePageId: string | null
  activeSurfaceId: string | null
  isLoading: boolean
  lastError: string | null
  canUndo: boolean
  canRedo: boolean
  documentTitle: string
  zoomPercent: number
}

export interface NotifyPayload {
  level: 'info' | 'success' | 'warning' | 'error'
  title: string
  message?: string
  durationMs?: number
}

export interface ConfirmPayload {
  id: string
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
}

/**
 * Session API used by Creator UI.
 * Internally bound to the host store; UI only talks to this façade.
 */
export class EditorSessionApi {
  getSnapshot(): EditorSnapshot {
    const s = useEditorStore.getState()
    const doc = s.document
    return {
      document: doc,
      selectedIds: s.selectedIds,
      selectedId: s.selectedId,
      hoverId: s.interaction.hoveredId,
      viewport: s.viewport,
      workspace: s.workspace,
      grid: s.grid,
      guidesVisible: guidesEngine.isVisible(),
      activePageId: s.activePageId,
      activeSurfaceId: s.activeSurfaceId,
      isLoading: s.isLoading,
      lastError: s.lastError,
      canUndo: historyEngine.canUndo(),
      canRedo: historyEngine.canRedo(),
      documentTitle: doc
        ? `${doc.metadata.name} · ${doc.type} · schema ${doc.schemaVersion}`
        : 'Sem documento',
      zoomPercent: Math.round(s.viewport.zoom * 100),
    }
  }

  subscribe(listener: () => void): () => void {
    return useEditorStore.subscribe(listener)
  }

  async bootstrap(masterId?: string): Promise<void> {
    await useEditorStore.getState().bootstrapSession(masterId)
  }

  dispatch(command: EditorCommand): boolean {
    return useEditorStore.getState().dispatch(command)
  }

  undo(): boolean {
    return useEditorStore.getState().undo()
  }

  redo(): boolean {
    return useEditorStore.getState().redo()
  }

  zoomIn(): void {
    useEditorStore.getState().zoomIn()
  }

  zoomOut(): void {
    useEditorStore.getState().zoomOut()
  }

  zoomTo100(): void {
    useEditorStore.getState().zoomTo100()
  }

  fitViewport(smooth = true): void {
    useEditorStore.getState().fitViewport(smooth)
  }

  fitWorkspace(smooth = true): void {
    useEditorStore.getState().fitWorkspace(smooth)
  }

  selectElement(id: string | null): void {
    useEditorStore.getState().selectElement(id)
  }

  selectElements(ids: string[]): void {
    useEditorStore.getState().selectElements(ids)
  }

  clearSelection(): void {
    useEditorStore.getState().clearSelection()
  }

  deleteSelected(): void {
    useEditorStore.getState().deleteSelected()
  }

  duplicateSelected(): void {
    useEditorStore.getState().duplicateSelected()
  }

  copySelected(): void {
    useEditorStore.getState().copySelected()
  }

  cutSelected(): void {
    useEditorStore.getState().cutSelected()
  }

  pasteClipboard(): void {
    useEditorStore.getState().pasteClipboard()
  }

  flipSelected(axis: 'horizontal' | 'vertical'): void {
    useEditorStore.getState().flipSelected(axis)
  }

  updateProperty(elementId: string, path: string, value: unknown): boolean {
    return useEditorStore.getState().updateProperty(elementId, path, value)
  }

  getPropertyDescriptors(elementId: string): PropertyDescriptor[] {
    const doc = useEditorStore.getState().document
    const el = doc?.elements.find((e) => e.id === elementId)
    if (!doc || !el) return []
    return PropertyEngine.getDescriptors(doc, el)
  }

  getGroupedPropertyDescriptors(elementId: string): Record<string, PropertyDescriptor[]> {
    const descriptors = this.getPropertyDescriptors(elementId)
    return PropertyEngine.groupDescriptors(descriptors)
  }

  getPropertyGroups() {
    return PROPERTY_GROUPS
  }

  getSelectedElement(): EkoElement | null {
    return useEditorStore.getState().getSelectedElement()
  }

  getSelectedElements(): EkoElement[] {
    return useEditorStore.getState().getSelectedElements()
  }

  getObjectCapabilities(elementId?: string | null): ObjectCapabilities | null {
    const id = elementId ?? useEditorStore.getState().selectedId
    const el = useEditorStore.getState().document?.elements.find((e) => e.id === id)
    if (!el) return null
    return objectRegistry.capabilities(el.type) ?? null
  }

  getObjectType(elementId?: string | null): ElementType | null {
    const id = elementId ?? useEditorStore.getState().selectedId
    const el = useEditorStore.getState().document?.elements.find((e) => e.id === id)
    return el?.type ?? null
  }

  listLayers(): LayerListItem[] {
    const s = useEditorStore.getState()
    const doc = s.document
    if (!doc) return []
    return LayerEngine.listForSurface(doc, s.activeSurfaceId)
  }

  listLibraryAssets() {
    const doc = useEditorStore.getState().document
    if (!doc) return []
    return listDocumentLibraryAssets(doc.assets)
  }

  listLibraryCatalog(): LibraryAssetEntry[] {
    const TEMPLATE_PLACEHOLDERS: LibraryAssetEntry[] = [
      {
        id: 'tpl_blank_placeholder',
        kind: 'template',
        name: 'Blank template',
        previewUri: null,
        sourceUri: '#template/blank',
      },
    ]
    return [...this.listLibraryAssets(), ...TEMPLATE_PLACEHOLDERS]
  }

  toggleSelect(elementId: string): void {
    useEditorStore.getState().toggleSelect(elementId)
  }

  applySelectionClick(
    elementId: string,
    modifiers: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean },
  ): void {
    const current = useEditorStore.getState().selectedIds
    const next = SelectionEngine.applyClick(current, elementId, modifiers)
    useEditorStore.getState().selectElements(next)
  }

  createObject(type: 'text' | 'shape' | 'image', partial?: Record<string, unknown>): boolean {
    const state = useEditorStore.getState()
    const doc = state.document
    const surfaceId = state.activeSurfaceId
    if (!doc || !surfaceId) {
      this.notify({ level: 'warning', title: 'Sem superfície ativa' })
      return false
    }
    const el = ObjectFactory.create(doc, type, {
      surfaceId,
      ...(partial as object),
    })
    if (!el) return false
    const ok = state.dispatch({
      type: 'AddElements',
      elements: [el],
      timestamp: Date.now(),
    })
    if (ok) this.notify({ level: 'success', title: `${type} adicionado` })
    return ok
  }

  insertAsset(payload: {
    assetId: string
    libraryKind: 'image' | 'svg' | 'template'
    sourceUri: string
    name: string
    mimeType?: string
  }): boolean {
    return useEditorStore.getState().insertAsset(payload)
  }

  setGrid(patch: Partial<GridConfig>): void {
    useEditorStore.getState().setGrid(patch)
  }

  toggleGridVisible(): void {
    const grid = useEditorStore.getState().grid
    useEditorStore.getState().setGrid({ visible: !grid.visible, enabled: true })
  }

  toggleGuidesVisible(): void {
    if (guidesEngine.isVisible()) guidesEngine.hide()
    else guidesEngine.show()
    // Nudge interaction so canvas re-reads guides
    useEditorStore.getState().setInteraction({ ...useEditorStore.getState().interaction })
    eventBus.emit(platformEvents.ToolChanged, { tool: 'guides', visible: guidesEngine.isVisible() })
  }

  activatePage(pageId: string): boolean {
    return useEditorStore.getState().activatePage(pageId)
  }

  addPage(name?: string): boolean {
    return useEditorStore.getState().addPage(name)
  }

  duplicatePage(pageId?: string): boolean {
    return useEditorStore.getState().duplicatePage(pageId)
  }

  /** Download JSON — host integration hook for WooCommerce later. */
  saveLocalDownload(): boolean {
    const doc = useEditorStore.getState().document
    if (!doc) return false
    downloadDocumentJson(doc)
    eventBus.emit(platformEvents.DocumentSaved, { documentId: doc.id, channel: 'download' })
    this.notify({ level: 'success', title: 'Documento salvo', message: 'JSON baixado com sucesso.' })
    return true
  }

  async saveToProvider(): Promise<boolean> {
    const doc = useEditorStore.getState().document
    if (!doc) return false
    try {
      await localDocumentProvider.saveDocument(doc)
      eventBus.emit(platformEvents.DocumentSaved, { documentId: doc.id, channel: 'provider' })
      this.notify({ level: 'success', title: 'Salvo', message: 'Documento persistido.' })
      return true
    } catch (error) {
      this.notify({
        level: 'error',
        title: 'Falha ao salvar',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      })
      return false
    }
  }

  openFilePicker(onJson: (json: string) => void): void {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const text = String(reader.result ?? '')
        onJson(text)
      }
      reader.readAsText(file)
    }
    input.click()
  }

  importJson(json: string): boolean {
    const ok = useEditorStore.getState().importJson(json)
    if (ok) {
      this.notify({ level: 'success', title: 'Documento aberto' })
    } else {
      this.notify({
        level: 'error',
        title: 'Falha ao abrir',
        message: useEditorStore.getState().lastError ?? 'JSON inválido',
      })
    }
    return ok
  }

  exportJson(): string | null {
    return useEditorStore.getState().exportJson()
  }

  notify(payload: NotifyPayload): void {
    eventBus.emit(platformEvents.Notify, payload)
  }

  requestConfirm(payload: ConfirmPayload): void {
    eventBus.emit(platformEvents.Confirm, payload)
  }

  /** Preview stub — hosts replace with lightbox / print preview adapter. */
  preview(): void {
    eventBus.emit(platformEvents.ToolChanged, { tool: 'preview' })
    this.notify({
      level: 'info',
      title: 'Preview',
      message: 'Modo preview preparado para o host (WooCommerce / iframe).',
    })
  }
}

export const editorSession = new EditorSessionApi()
