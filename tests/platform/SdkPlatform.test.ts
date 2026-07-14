import { describe, expect, it } from 'vitest'
import { EkoPrintStudio, platformEvents } from '@/sdk/EkoPrintStudio'
import { createEmptyDocument } from '@/core/document/createDocument'
import { eventBus } from '@/core/events/EventBus'
import { createHostBridge } from '@/core/host/HostBridge'
import { PluginRegistry } from '@/core/plugins/PluginRegistry'
import { objectRegistry } from '@/core/registry/ObjectRegistry'
import { rendererRegistry } from '@/core/render/RendererRegistry'
import { overlaySystem } from '@/core/render/OverlaySystem'
import { renderPipeline } from '@/core/render/RenderPipeline'
import type { PlatformProviders } from '@/core/platform/providers'

describe('SDK & platform readiness', () => {
  it('EkoPrintStudio open / on / export / destroy', async () => {
    const editor = new EkoPrintStudio()
    const doc = createEmptyDocument()
    doc.metadata.name = 'SDK'
    const seen: string[] = []
    const off = editor.on(platformEvents.DocumentOpened, (payload) => {
      seen.push((payload as { documentId: string }).documentId)
    })
    editor.open(doc)
    expect(editor.getDocument()?.id).toBe(doc.id)
    expect(seen).toContain(doc.id)

    const exported = await editor.export('json')
    expect(exported.mimeType).toBe('application/json')
    expect(typeof exported.data).toBe('string')

    off()
    editor.destroy()
    expect(() => editor.open(doc)).toThrow(/destroyed/)
  })

  it('host bridge message bus + rpc are browser-free', async () => {
    const host = createHostBridge()
    const received: unknown[] = []
    host.bus.subscribe('editor', (msg) => received.push(msg.payload))
    host.bus.publish({
      kind: 'event',
      channel: 'editor',
      type: 'ping',
      payload: { ok: true },
    })
    expect(received).toEqual([{ ok: true }])

    host.rpc.handle('echo', (req: { n: number }) => ({ n: req.n * 2 }))
    await expect(host.rpc.call('echo', { n: 21 })).resolves.toEqual({ n: 42 })
  })

  it('plugin registry registers objects/renderers without Core knowing plugin id', () => {
    const plugins = new PluginRegistry({
      registerObject: (definition) => objectRegistry.register(definition),
      registerRenderer: (renderer) => rendererRegistry.register(renderer),
      registerOverlay: (contributor) => overlaySystem.register(contributor),
      registerPass: (pass) => renderPipeline.registerPass(pass),
    })

    plugins.register({
      id: 'test-plugin',
      name: 'Test',
      capabilities: ['objects', 'renderers'],
      renderers: [
        {
          key: 'stub',
          render: (element) => ({
            kind: 'stub',
            id: element.id,
            transform: { ...element.transform },
            opacity: 1,
            visible: true,
            locked: false,
            meta: { fromPlugin: true },
          }),
        },
      ],
    })

    expect(plugins.has('test-plugin')).toBe(true)
    plugins.unregister('test-plugin')
    expect(plugins.has('test-plugin')).toBe(false)
  })

  it('platform provider contracts are injectable types only', () => {
    const providers: PlatformProviders = {
      persistence: {
        async save(document) {
          return document
        },
        async load() {
          return createEmptyDocument()
        },
      },
    }
    const editor = new EkoPrintStudio({ providers })
    expect(editor.getPlugins()).toBeTruthy()
    eventBus.clear()
  })
})
