import { sampleMasterTemplate } from '@/data/sampleDocuments'
import { serializeDocument } from '@/core/document/serializeDocument'
import { createSimpleMaster } from './createSimpleMaster'
import { templateRegistry } from './TemplateRegistry'
import type { TemplateMasterInfo } from './types'

let registered = false

/** Canonical master id for the Caneca Brasil demo (kept stable for existing Woo products). */
export const CANECA_BRASIL_MASTER_ID = 'template_caneca-brasil'

/**
 * Seeds the official Template Registry with built-in masters.
 * Idempotent — safe to call from provider constructors and tests.
 */
export function ensureBuiltinTemplatesRegistered(): void {
  if (registered && templateRegistry.has(CANECA_BRASIL_MASTER_ID)) return

  templateRegistry.clear()

  const caneca = serializeDocument(sampleMasterTemplate)
  templateRegistry.register({
    id: caneca.id,
    name: caneca.metadata.name || 'Caneca Brasil',
    category: 'Canecas',
    thumbnail: undefined,
    status: 'published',
    document: caneca,
  })

  const simples: Array<{
    info: Omit<TemplateMasterInfo, 'id' | 'status'> & { id: string }
    width: number
    height: number
    backgroundColor: string
    headline: string
    productId: string
  }> = [
    {
      info: { id: 'template_cartao-premium', name: 'Cartão Premium', category: 'Cartões' },
      width: 90,
      height: 50,
      backgroundColor: '#F8FAFC',
      headline: 'Cartão Premium',
      productId: 'cartao-premium',
    },
    {
      info: { id: 'template_flyer-a5', name: 'Flyer A5', category: 'Folhetos' },
      width: 148,
      height: 210,
      backgroundColor: '#FFF7ED',
      headline: 'Flyer A5',
      productId: 'flyer-a5',
    },
    {
      info: { id: 'template_banner-90x120', name: 'Banner 90x120', category: 'Banners' },
      width: 900,
      height: 1200,
      backgroundColor: '#EEF2FF',
      headline: 'Banner 90×120',
      productId: 'banner-90x120',
    },
  ]

  for (const entry of simples) {
    templateRegistry.register({
      ...entry.info,
      status: 'published',
      document: createSimpleMaster({
        id: entry.info.id,
        name: entry.info.name,
        productId: entry.productId,
        width: entry.width,
        height: entry.height,
        backgroundColor: entry.backgroundColor,
        headline: entry.headline,
      }),
    })
  }

  registered = true
}

/** Public catalog snapshot (published only) for hosts / static JSON sync. */
export function getPublishedTemplateCatalog(): TemplateMasterInfo[] {
  ensureBuiltinTemplatesRegistered()
  return templateRegistry.listPublished()
}
