import type { EkoDocument } from '@/types/document'
import type { ProductionPreviewRef } from '@/types/commerce'
import type { ExportFormat, ExportProvider, ExportResult } from '@/core/platform/providers'

/**
 * Composes Domain + Raster (and optionally future PDF/Print) into one ExportProvider.
 * Session preview prefers raster (`preview.png`); domain JSON stays in `domainData`.
 */
export class CompositeExportProvider implements ExportProvider {
  readonly id = 'composite'
  readonly formats: readonly ExportFormat[]
  private readonly providers: ExportProvider[]
  private readonly preferredPreviewId: string

  constructor(options: {
    providers: ExportProvider[]
    /** Provider id preferred for createSessionPreview (default: `raster`). */
    preferredPreviewId?: string
  }) {
    this.providers = options.providers
    this.preferredPreviewId = options.preferredPreviewId ?? 'raster'
    this.formats = uniqueFormats(options.providers)
  }

  async exportDocument(
    document: EkoDocument,
    options: { format: ExportFormat; quality?: number },
  ): Promise<ExportResult> {
    const provider = this.providers.find((p) => p.formats.includes(options.format))
    if (!provider) {
      throw new Error(`CompositeExportProvider: no provider for format "${options.format}"`)
    }
    return provider.exportDocument(document, options)
  }

  async createSessionPreview(document: EkoDocument): Promise<ProductionPreviewRef> {
    const preferred =
      this.providers.find((p) => p.id === this.preferredPreviewId) ??
      this.providers.find((p) => p.formats.includes('png'))

    if (preferred) {
      try {
        const preview = await preferred.createSessionPreview(document)
        // Ensure domain companion is present for compatibility.
        if (!preview.domainData) {
          const domain = this.providers.find((p) => p.id === 'domain')
          if (domain) {
            const domainPreview = await domain.createSessionPreview(document)
            return { ...preview, domainData: domainPreview.data }
          }
        }
        return preview
      } catch {
        /* fall through to next */
      }
    }

    for (const provider of this.providers) {
      if (provider === preferred) continue
      try {
        return await provider.createSessionPreview(document)
      } catch {
        /* try next */
      }
    }

    throw new Error('CompositeExportProvider: unable to create session preview')
  }
}

function uniqueFormats(providers: ExportProvider[]): ExportFormat[] {
  const set = new Set<ExportFormat>()
  for (const p of providers) {
    for (const f of p.formats) set.add(f)
  }
  return [...set]
}
