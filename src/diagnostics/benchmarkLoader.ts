import { elementLifecycle } from '@/core/document/elementLifecycle'
import { documentEvents, eventBus } from '@/core/events/EventBus'
import { useEditorStore } from '@/store/editorStore'
import { markRenderStart, resetEditorDiagnosticsForTests } from './editorDiagnostics'
import { createBenchmarkDocument, type BenchmarkSize } from './benchmarkDocuments'
import { resetRuntimeBenchmarkForTests } from './runtimeBenchmark'

/** Dev-only: swap the active session with a benchmark fixture document. */
export function loadBenchmarkDocument(size: BenchmarkSize): boolean {
  if (!import.meta.env.DEV) return false

  const session = createBenchmarkDocument(size)
  elementLifecycle.clear()
  elementLifecycle.markLoaded(session.elements.map((el) => el.id))

  resetEditorDiagnosticsForTests()
  resetRuntimeBenchmarkForTests()
  markRenderStart()

  const store = useEditorStore.getState()
  const ok = store.dispatch({
    type: 'LoadDocument',
    document: session,
    timestamp: Date.now(),
  })
  if (!ok) return false

  const pageId = session.pages?.[0]?.id ?? null
  const surfaceId = session.surfaces?.[0]?.id ?? null
  if (pageId && surfaceId) {
    store.setActiveLayout(pageId, surfaceId)
  }

  eventBus.emit(documentEvents.DOCUMENT_CHANGED, { documentId: session.id })
  eventBus.emit(documentEvents.LAYOUT_CHANGED, { pageId, surfaceId })
  store.fitViewport()
  return true
}
