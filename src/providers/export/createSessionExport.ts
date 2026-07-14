import type { ExportProvider } from '@/core/platform/providers'
import { DomainExportProvider } from './DomainExportProvider'
import { RasterExportProvider } from './RasterExportProvider'
import { CompositeExportProvider } from './CompositeExportProvider'

export interface SessionExportConfig {
  /**
   * When true (default for commerce), session preview is raster `preview.png`
   * with domain JSON in `domainData`.
   * When false, domain-only (standalone Creator default).
   */
  includeRaster?: boolean
  maxPreviewEdge?: number
}

/**
 * Builds the official ExportProvider stack for a host.
 * - Standalone: Domain only
 * - Commerce: Domain + Raster composite (raster preferred for session preview)
 */
export function createSessionExport(config: SessionExportConfig = {}): ExportProvider {
  const domain = new DomainExportProvider()
  if (config.includeRaster === false) {
    return domain
  }
  return new CompositeExportProvider({
    providers: [domain, new RasterExportProvider({ maxEdge: config.maxPreviewEdge })],
    preferredPreviewId: 'raster',
  })
}
