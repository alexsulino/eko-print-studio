import type { EkoDocument } from '@/types/document'
import type { ProductionPreviewRef } from '@/types/commerce'
import { exportDocument } from '@/core/document/serializeDocument'
import { getDocumentPixelSize } from '@/core/document/units'
import { RasterExportProvider } from '@/providers/export/RasterExportProvider'

/**
 * @deprecated Prefer `DomainExportProvider.createSessionPreview` / `ExportProvider`.
 * Sync domain snapshot kept for older call sites.
 */
export function buildProductionPreview(document: EkoDocument): ProductionPreviewRef {
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

/**
 * @deprecated Prefer `RasterExportProvider` / `CompositeExportProvider.createSessionPreview`.
 */
export async function buildRasterPreview(
  document: EkoDocument,
  exportFn?: (doc: EkoDocument) => Promise<{ mimeType: string; data: ArrayBuffer | string }>,
): Promise<ProductionPreviewRef> {
  if (!exportFn) {
    return new RasterExportProvider().createSessionPreview(document)
  }
  const size = getDocumentPixelSize(document.canvas)
  const exported = await exportFn(document)
  const data =
    typeof exported.data === 'string'
      ? exported.data
      : arrayBufferToBase64DataUrl(exported.data, exported.mimeType)
  return {
    format: exported.mimeType.includes('svg') ? 'svg' : 'png',
    mimeType: exported.mimeType,
    data,
    widthPx: size.widthPx,
    heightPx: size.heightPx,
    generatedAt: new Date().toISOString(),
    fidelity: 'raster',
    filename: 'preview.png',
    domainData: exportDocument(document),
  }
}

function arrayBufferToBase64DataUrl(buffer: ArrayBuffer, mimeType: string): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  const encode =
    typeof btoa === 'function'
      ? btoa
      : (value: string) => {
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
          let out = ''
          for (let i = 0; i < value.length; i += 3) {
            const a = value.charCodeAt(i)
            const b = value.charCodeAt(i + 1) || 0
            const c = value.charCodeAt(i + 2) || 0
            out += chars[a >> 2]
            out += chars[((a & 3) << 4) | (b >> 4)]
            out += i + 1 < value.length ? chars[((b & 15) << 2) | (c >> 6)] : '='
            out += i + 2 < value.length ? chars[c & 63] : '='
          }
          return out
        }
  return `data:${mimeType};base64,${encode(binary)}`
}
