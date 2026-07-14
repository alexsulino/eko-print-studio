import type { EkoDocument } from '@/types/document'
import type { ProductionPreviewRef } from '@/types/commerce'
import type { ExportFormat, ExportProvider, ExportResult } from '@/core/platform/providers'

/**
 * Prepared PDF ExportProvider — swap-compatible with Domain/Raster.
 * Not wired into commerce stacks until the print pipeline lands.
 */
export class FuturePdfExportProvider implements ExportProvider {
  readonly id = 'pdf'
  readonly formats = ['pdf'] as const satisfies readonly ExportFormat[]

  async exportDocument(
    _document: EkoDocument,
    options: { format: ExportFormat; quality?: number },
  ): Promise<ExportResult> {
    throw new Error(`FuturePdfExportProvider: format "${options.format}" is not implemented yet`)
  }

  async createSessionPreview(_document: EkoDocument): Promise<ProductionPreviewRef> {
    throw new Error('FuturePdfExportProvider: session preview not implemented yet')
  }
}
