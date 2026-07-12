import { CURRENT_SCHEMA_VERSION, type DocumentPermissions, type DocumentVariables, type EkoDocument } from '@/types/document'
import { createId } from '@/utils/id'

export function defaultPermissions(overrides?: Partial<DocumentPermissions>): DocumentPermissions {
  return {
    canEdit: true,
    canExport: true,
    canSave: true,
    canAddElements: true,
    canDeleteElements: true,
    canChangeBackground: true,
    lockMaster: true,
    ...overrides,
  }
}

export function defaultVariables(overrides?: Partial<DocumentVariables>): DocumentVariables {
  return {
    definitions: [],
    values: {},
    ...overrides,
  }
}

export function createEmptyDocument(
  partial?: Partial<EkoDocument> & { metadata?: Partial<EkoDocument['metadata']> },
): EkoDocument {
  const now = new Date().toISOString()

  return {
    id: partial?.id ?? createId('doc'),
    type: partial?.type ?? 'template',
    schemaVersion: partial?.schemaVersion ?? CURRENT_SCHEMA_VERSION,
    metadata: {
      name: partial?.metadata?.name ?? 'Untitled',
      productId: partial?.metadata?.productId,
      masterId: partial?.metadata?.masterId,
      createdAt: partial?.metadata?.createdAt ?? now,
      updatedAt: partial?.metadata?.updatedAt ?? now,
      orientation: partial?.metadata?.orientation ?? 'portrait',
      production: partial?.metadata?.production,
    },
    canvas: partial?.canvas ?? {
      width: 100,
      height: 100,
      unit: 'mm',
      dpi: 300,
      backgroundColor: '#ffffff',
    },
    rules: partial?.rules ?? {
      allowedFonts: ['Montserrat', 'Roboto'],
      allowedBackgrounds: [],
      allowAddElements: true,
      allowDeleteElements: true,
    },
    assets: partial?.assets ?? {
      fonts: [],
      images: [],
      backgrounds: [],
    },
    permissions: partial?.permissions ?? defaultPermissions(),
    variables: partial?.variables ?? defaultVariables(),
    elements: partial?.elements ?? [],
    pages: partial?.pages,
  }
}
