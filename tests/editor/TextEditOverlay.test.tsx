// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TextEditOverlay } from '@/editor/canvas/TextEditOverlay'
import { useEditorStore } from '@/store/editorStore'
import { normalizeDocument } from '@/core/document/normalizeDocument'
import { cloneToSession } from '@/core/document/cloneToSession'
import { serializeDocument } from '@/core/document/serializeDocument'
import { sampleMasterTemplate } from '@/data/sampleDocuments'
import { historyEngine } from '@/core/history/HistoryEngine'
import { IDLE_INTERACTION_SESSION } from '@/types/interaction'
import type { TextElement } from '@/types/element'

describe('Text edit session', () => {
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
      interaction: {
        ...useEditorStore.getState().interaction,
        session: { ...IDLE_INTERACTION_SESSION },
      },
    })
  })

  function textElement(): TextElement {
    const el = useEditorStore.getState().document!.elements.find((e) => e.type === 'text')
    if (!el || el.type !== 'text') throw new Error('expected text element')
    return el
  }

  it('beginInteractionSession coordinates kind+elementId only', () => {
    const el = textElement()
    expect(
      useEditorStore.getState().beginInteractionSession({
        kind: 'textEdit',
        elementId: el.id,
      }),
    ).toBe(true)
    expect(useEditorStore.getState().interaction.session).toEqual({
      kind: 'textEdit',
      elementId: el.id,
    })
    expect(useEditorStore.getState().selectedId).toBe(el.id)
  })

  it('product commit path writes one UpdateProperty into history', () => {
    const el = textElement()
    const original = el.properties.text
    useEditorStore.getState().beginInteractionSession({
      kind: 'textEdit',
      elementId: el.id,
    })

    // Same as CanvasEditor.handleTextEditCommit after overlay draft finalize
    const next = 'Nome Editado'
    const id = useEditorStore.getState().interaction.session.elementId!
    const current = useEditorStore.getState().document!.elements.find((e) => e.id === id)
    useEditorStore.getState().endInteractionSession()
    if (current?.type === 'text' && next !== current.properties.text) {
      useEditorStore.getState().updateProperty(id, 'properties.text', next)
    }

    expect(useEditorStore.getState().interaction.session.kind).toBe('none')
    const updated = useEditorStore.getState().document!.elements.find((e) => e.id === el.id)
    if (updated?.type === 'text') expect(updated.properties.text).toBe(next)
    expect(historyEngine.canUndo()).toBe(true)

    useEditorStore.getState().undo()
    const restored = useEditorStore.getState().document!.elements.find((e) => e.id === el.id)
    if (restored?.type === 'text') expect(restored.properties.text).toBe(original)
    expect(historyEngine.canUndo()).toBe(false)
  })

  it('rejects textEdit when changeText is denied', () => {
    const doc = useEditorStore.getState().document!
    const brand = doc.elements.find((e) => e.type === 'text' && e.category === 'brand')
    // sample may only have customer text — force constraints
    const el = textElement()
    const locked = {
      ...doc,
      elements: doc.elements.map((item) =>
        item.id === el.id
          ? { ...item, constraints: { ...item.constraints, changeText: false } }
          : item,
      ),
    }
    useEditorStore.setState({ document: locked })
    expect(
      useEditorStore.getState().beginInteractionSession({
        kind: 'textEdit',
        elementId: el.id,
      }),
    ).toBe(false)
    expect(useEditorStore.getState().interaction.session.kind).toBe('none')
    void brand
  })
})

describe('TextEditOverlay UI', () => {
  let container: HTMLDivElement
  let root: Root

  afterEach(() => {
    act(() => root?.unmount())
    container?.remove()
  })

  const sampleText: TextElement = {
    id: 'el_text',
    type: 'text',
    category: 'customer',
    name: 'T',
    visible: true,
    locked: false,
    editable: true,
    zIndex: 1,
    transform: {
      x: 10,
      y: 20,
      width: 100,
      height: 40,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    },
    metadata: {},
    constraints: { changeText: true },
    properties: {
      text: 'Hello',
      fontFamily: 'Montserrat',
      fontSize: 24,
      fill: '#000',
    },
  }

  function mount(handlers: { onCommit: (t: string) => void; onCancel: () => void }) {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => {
      root.render(
        <TextEditOverlay
          element={sampleText}
          viewport={{ zoom: 1, panX: 0, panY: 0 }}
          onCommit={handlers.onCommit}
          onCancel={handlers.onCancel}
        />,
      )
    })
  }

  it('Escape cancels without commit', () => {
    const onCommit = vi.fn()
    const onCancel = vi.fn()
    mount({ onCommit, onCancel })
    const textarea = container.querySelector(
      '[data-testid="text-edit-overlay"]',
    ) as HTMLTextAreaElement

    act(() => {
      textarea.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      )
    })

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('Enter commits current draft once', () => {
    const onCommit = vi.fn()
    const onCancel = vi.fn()
    mount({ onCommit, onCancel })
    const textarea = container.querySelector(
      '[data-testid="text-edit-overlay"]',
    ) as HTMLTextAreaElement

    act(() => {
      // React 19: set the value tracker then dispatch input
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value',
      )?.set
      setter?.call(textarea, 'Updated')
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    })

    act(() => {
      textarea.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      )
    })

    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith('Updated')
    expect(onCancel).not.toHaveBeenCalled()

    act(() => {
      textarea.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      )
    })
    expect(onCommit).toHaveBeenCalledTimes(1)
  })

  it('positions overlay from full viewport transform', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => {
      root.render(
        <TextEditOverlay
          element={{
            ...sampleText,
            transform: { ...sampleText.transform, x: 50, y: 25, rotation: 10, scaleX: 2 },
          }}
          viewport={{ zoom: 2, panX: 5, panY: 7 }}
          onCommit={vi.fn()}
          onCancel={vi.fn()}
        />,
      )
    })
    const textarea = container.querySelector(
      '[data-testid="text-edit-overlay"]',
    ) as HTMLTextAreaElement
    expect(textarea.style.left).toBe('105px') // 50*2+5
    expect(textarea.style.top).toBe('57px') // 25*2+7
    expect(textarea.style.transform).toContain('rotate(10deg)')
    expect(textarea.style.transform).toContain('scale(2, 1)')
    expect(textarea.style.fontSize).toBe('48px') // 24*zoom
  })
})
