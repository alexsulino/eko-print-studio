// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AssetLibrary } from '@/editor/assets'
import { useEditorStore } from '@/store/editorStore'
import { normalizeDocument } from '@/core/document/normalizeDocument'
import { cloneToSession } from '@/core/document/cloneToSession'
import { serializeDocument } from '@/core/document/serializeDocument'
import { sampleMasterTemplate } from '@/data/sampleDocuments'
import { historyEngine } from '@/core/history/HistoryEngine'

describe('AssetLibrary UI', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    historyEngine.clear()
    const doc = normalizeDocument(cloneToSession(serializeDocument(sampleMasterTemplate)))
    useEditorStore.setState({
      document: doc,
      activePageId: doc.pages?.[0]?.id ?? null,
      activeSurfaceId: doc.surfaces?.[0]?.id ?? null,
      selectedIds: [],
      selectedId: null,
      lastError: null,
    })
  })

  afterEach(() => {
    act(() => root?.unmount())
    container?.remove()
  })

  function mount() {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => {
      root.render(<AssetLibrary />)
    })
  }

  it('renders cards from document assets and inserts via command', () => {
    mount()
    expect(container.querySelector('[data-testid="asset-library"]')).toBeTruthy()
    const card = container.querySelector('[data-testid="asset-card-img-demo"]') as HTMLButtonElement
    expect(card).toBeTruthy()

    const before = useEditorStore.getState().document!.elements.length
    act(() => {
      card.click()
    })

    const state = useEditorStore.getState()
    expect(state.document!.elements.length).toBe(before + 1)
    expect(state.selectedIds.length).toBe(1)
    const selected = state.document!.elements.find((e) => e.id === state.selectedId)
    expect(selected?.type).toBe('image')
    if (selected?.type === 'image') {
      expect(selected.properties.assetId).toBe('img-demo')
    }
  })

  it('undo removes inserted asset element', () => {
    mount()
    const card = container.querySelector('[data-testid="asset-card-img-demo"]') as HTMLButtonElement
    const before = useEditorStore.getState().document!.elements.length

    act(() => {
      card.click()
    })
    expect(useEditorStore.getState().document!.elements.length).toBe(before + 1)

    act(() => {
      useEditorStore.getState().undo()
    })
    expect(useEditorStore.getState().document!.elements.length).toBe(before)
  })
})
