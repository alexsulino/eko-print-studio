import type {
  DocumentCanvas,
  DocumentMetadata,
  DocumentProductionMeta,
  EkoDocument,
  Orientation,
  Unit,
} from '@/types/document'

export interface DocumentConfigPatch {
  name?: string
  description?: string
  width?: number
  height?: number
  unit?: Unit
  dpi?: number
  orientation?: Orientation
  backgroundColor?: string
  production?: Partial<DocumentProductionMeta>
}

/**
 * Document Engine — pure operations on EkoDocument metadata / canvas config.
 * Does not own viewport, workspace, or element mutation (commands do).
 */
export class DocumentEngine {
  static getActive(document: EkoDocument | null): EkoDocument | null {
    return document
  }

  static getMetadata(document: EkoDocument): DocumentMetadata {
    return { ...document.metadata }
  }

  static getCanvas(document: EkoDocument): DocumentCanvas {
    return { ...document.canvas }
  }

  static getSchemaVersion(document: EkoDocument): string {
    return document.schemaVersion
  }

  /** Prepare multi-page products: ensure pages/surfaces arrays exist. */
  static ensurePageContainers(document: EkoDocument): EkoDocument {
    return {
      ...document,
      pages: document.pages ? [...document.pages] : [],
      surfaces: document.surfaces ? [...document.surfaces] : [],
      regions: document.regions ? [...document.regions] : [],
    }
  }

  static applyConfig(document: EkoDocument, patch: DocumentConfigPatch): EkoDocument {
    const metadata: DocumentMetadata = {
      ...document.metadata,
      name: patch.name ?? document.metadata.name,
      orientation: patch.orientation ?? document.metadata.orientation,
      updatedAt: new Date().toISOString(),
      production: patch.production
        ? { ...document.metadata.production, ...patch.production }
        : document.metadata.production,
    }

    if (patch.description !== undefined) {
      metadata.description = patch.description
    }

    const canvas: DocumentCanvas = {
      ...document.canvas,
      width: patch.width ?? document.canvas.width,
      height: patch.height ?? document.canvas.height,
      unit: patch.unit ?? document.canvas.unit,
      dpi: patch.dpi ?? document.canvas.dpi,
      backgroundColor: patch.backgroundColor ?? document.canvas.backgroundColor,
    }

    return { ...document, metadata, canvas }
  }

  static pageCount(document: EkoDocument): number {
    return document.pages?.length ?? 0
  }
}
