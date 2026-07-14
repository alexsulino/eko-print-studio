import type { EkoDocument } from '@/types/document'
import type { ProductionPreviewRef } from '@/types/commerce'
import type { ExportFormat, ExportProvider, ExportResult } from '@/core/platform/providers'
import { exportDocument } from '@/core/document/serializeDocument'
import { getDocumentPixelSize } from '@/core/document/units'

/**
 * Domain ExportProvider — JSON session preview (schema-faithful, no pixels).
 * Standalone default and raster fallback.
 */
export class DomainExportProvider implements ExportProvider {
  readonly id = 'domain'
  readonly formats = ['json'] as const satisfies readonly ExportFormat[]

  async exportDocument(
    document: EkoDocument,
    options: { format: ExportFormat; quality?: number },
  ): Promise<ExportResult> {
    if (options.format !== 'json') {
      throw new Error(`DomainExportProvider: unsupported format "${options.format}"`)
    }
    return {
      format: 'json',
      mimeType: 'application/json',
      data: exportDocument(document),
    }
  }

  async createSessionPreview(document: EkoDocument): Promise<ProductionPreviewRef> {
    const size = getDocumentPixelSize(document.canvas)
    const data = exportDocument(document)
    return {
      format: 'json',
      mimeType: 'application/json',
      data,
      widthPx: size.widthPx,
      heightPx: size.heightPx,
      generatedAt: new Date().toISOString(),
      fidelity: 'domain',
      domainData: data,
    }
  }
}
