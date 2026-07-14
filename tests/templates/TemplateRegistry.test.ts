import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, beforeEach } from 'vitest'
import {
  ensureBuiltinTemplatesRegistered,
  getPublishedTemplateCatalog,
  SAMPLE_MASTER_ID,
  templateRegistry,
} from '@/core/templates'
import { localDocumentProvider } from '@/providers/LocalDocumentProvider'

describe('Template Registry', () => {
  beforeEach(() => {
    templateRegistry.clear()
    ensureBuiltinTemplatesRegistered()
  })

  it('registers published masters with catalog metadata', () => {
    const catalog = getPublishedTemplateCatalog()
    expect(catalog.length).toBeGreaterThanOrEqual(4)
    expect(catalog.every((t) => t.status === 'published')).toBe(true)
    expect(catalog.map((t) => t.name)).toEqual(
      expect.arrayContaining(['Caneca Brasil', 'Cartão Premium', 'Flyer A5', 'Banner 90x120']),
    )
  })

  it('keeps Caneca Brasil id stable for existing Woo products', () => {
    expect(SAMPLE_MASTER_ID).toBe('template_caneca-brasil')
    expect(templateRegistry.getDocument(SAMPLE_MASTER_ID)?.metadata.name).toBe('Caneca Brasil')
  })

  it('matches public catalog.json shipped for Woo sync', () => {
    const publishedIds = new Set(getPublishedTemplateCatalog().map((t) => t.id))
    const catalogJson = JSON.parse(
      readFileSync(path.join(process.cwd(), 'public/templates/catalog.json'), 'utf8'),
    ) as { schema: string; templates: Array<{ id: string; status: string }> }
    expect(catalogJson.schema).toBe('eko.templates.catalog/1')
    for (const entry of catalogJson.templates) {
      expect(publishedIds.has(entry.id)).toBe(true)
      expect(entry.status).toBe('published')
    }
  })

  it('seeds LocalDocumentProvider sessions from registry masters', async () => {
    for (const entry of getPublishedTemplateCatalog()) {
      const session = await localDocumentProvider.createSession(entry.id)
      expect(session.type).toBe('session')
      expect(session.metadata.masterId).toBe(entry.id)
    }
  })
})
