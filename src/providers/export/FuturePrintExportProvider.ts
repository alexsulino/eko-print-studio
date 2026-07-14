import type { EkoDocument } from '@/types/document'
import type { ProductionPreviewRef } from '@/types/commerce'
import type { ExportFormat, ExportProvider, ExportResult } from '@/core/platform/providers'

/**
 * Prepared production-print ExportProvider (RIP / CMYK pipeline).
 * Reserved for Print Pipeline evolution — not used in commerce MVP.
 */
export class FuturePrintExportProvider implements ExportProvider {
  readonly id = 'print'
  readonly formats = ['pdf', 'png'] as const satisfies readonly ExportFormat[]

  async exportDocument(
    _document: EkoDocument,
    options: { format: ExportFormat; quality?: number },
  ): Promise<ExportResult> {
    throw new Error(`FuturePrintExportProvider: format "${options.format}" is not implemented yet`)
  }

  async createSessionPreview(_document: EkoDocument): Promise<ProductionPreviewRef> {
    throw new Error('FuturePrintExportProvider: session preview not implemented yet')
  }
}
