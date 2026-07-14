import { describe, expect, it, beforeEach } from 'vitest'
import { editorSession } from '@/sdk/session/EditorSession'
import { themeEngine } from '@/ui/theme/ThemeEngine'
import { platformEvents, eventBus } from '@/core/events/EventBus'
import { useEditorStore } from '@/store/editorStore'
import { normalizeDocument } from '@/core/document/normalizeDocument'
import { cloneToSession } from '@/core/document/cloneToSession'
import { serializeDocument } from '@/core/document/serializeDocument'
import { sampleMasterTemplate } from '@/data/sampleDocuments'
import { historyEngine } from '@/core/history/HistoryEngine'

describe('Creator Experience SDK session', () => {
  beforeEach(() => {
    historyEngine.clear()
    eventBus.clear()
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

  it('exposes snapshot + property descriptors without UI importing Core', () => {
    const snap = editorSession.getSnapshot()
    expect(snap.document).toBeTruthy()
    expect(snap.zoomPercent).toBeGreaterThan(0)

    const text = snap.document!.elements.find((e) => e.type === 'text')!
    editorSession.selectElement(text.id)
    const descriptors = editorSession.getPropertyDescriptors(text.id)
    expect(descriptors.length).toBeGreaterThan(0)
    expect(editorSession.getObjectCapabilities(text.id)?.editText).toBe(true)
  })

  it('notifies via platformEvents.Notify', () => {
    const seen: string[] = []
    eventBus.on(platformEvents.Notify, (p) => {
      seen.push((p as { title: string }).title)
    })
    editorSession.notify({ level: 'success', title: 'ok' })
    expect(seen).toEqual(['ok'])
  })

  it('theme engine switches palettes', () => {
    themeEngine.setTheme('dark')
    expect(themeEngine.getThemeId()).toBe('dark')
    expect(themeEngine.getPalette().bg).toBeTruthy()
    themeEngine.setTheme('canva')
    expect(themeEngine.getThemeId()).toBe('canva')
  })
})
