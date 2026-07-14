import { describe, expect, it } from 'vitest'
import { localDocumentProvider } from '@/providers/LocalDocumentProvider'
import {
  CompositeExportProvider,
  DomainExportProvider,
  RasterExportProvider,
  createSessionExport,
} from '@/providers/export'
import { SAMPLE_MASTER_ID } from '@/core/templates'
import { PersonalizationSessionManager } from '@/sdk/commerce/PersonalizationSessionManager'
import { InMemorySessionPersistenceProvider } from '@/providers/InMemorySessionPersistenceProvider'
import { historyEngine } from '@/core/history/HistoryEngine'
import { eventBus } from '@/core/events/EventBus'

describe('ExportProvider architecture', () => {
  it('DomainExportProvider produces JSON session preview', async () => {
    const doc = await localDocumentProvider.createSession(SAMPLE_MASTER_ID)
    const preview = await new DomainExportProvider().createSessionPreview(doc)
    expect(preview.fidelity).toBe('domain')
    expect(preview.format).toBe('json')
    expect(preview.data).toContain('"type": "session"')
  })

  it('RasterExportProvider produces official preview.png', async () => {
    const doc = await localDocumentProvider.createSession(SAMPLE_MASTER_ID)
    const preview = await new RasterExportProvider().createSessionPreview(doc)
    expect(preview.fidelity).toBe('raster')
    expect(preview.format).toBe('png')
    expect(preview.filename).toBe('preview.png')
    expect(preview.mimeType).toBe('image/png')
    expect(preview.data.startsWith('data:image/png')).toBe(true)
    expect(preview.domainData).toContain('"type": "session"')
  })

  it('Composite prefers raster and keeps domainData', async () => {
    const doc = await localDocumentProvider.createSession(SAMPLE_MASTER_ID)
    const exporter = new CompositeExportProvider({
      providers: [new DomainExportProvider(), new RasterExportProvider()],
    })
    const preview = await exporter.createSessionPreview(doc)
    expect(preview.fidelity).toBe('raster')
    expect(preview.filename).toBe('preview.png')
    expect(preview.domainData).toBeTruthy()
  })

  it('createSessionExport(includeRaster:false) stays domain-only', async () => {
    const exporter = createSessionExport({ includeRaster: false })
    expect(exporter.id).toBe('domain')
  })

  it('PersonalizationSessionManager persists raster preview via ExportProvider', async () => {
    historyEngine.clear()
    eventBus.clear()
    const persistence = new InMemorySessionPersistenceProvider()
    const manager = new PersonalizationSessionManager({
      documentProvider: localDocumentProvider,
      persistence,
      export: createSessionExport({ includeRaster: true }),
    })
    await manager.start({ productId: '1', templateId: SAMPLE_MASTER_ID }, 'modal')
    const { cart } = await manager.save()
    expect(cart.preview.filename).toBe('preview.png')
    expect(cart.preview.fidelity).toBe('raster')
    const stored = await persistence.loadSession(cart.sessionId)
    expect(stored?.record.preview?.filename).toBe('preview.png')
    manager.destroy()
  })
})
