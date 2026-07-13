import type { AssetRef, DocumentAssets } from '@/types/document'
import type { AssetRepository } from './AssetRepository'
import type { AssetType, CreateAssetInput } from './types'

function mapKind(source?: AssetRef['source']): CreateAssetInput['source']['kind'] {
  switch (source) {
    case 'cdn':
      return 'cdn'
    case 'wp-media':
      return 'wp-media'
    case 'api':
      return 'api'
    case 'local':
      return 'local'
    default:
      return 'url'
  }
}

function toCreateInput(ref: AssetRef, type: AssetType): CreateAssetInput {
  return {
    id: ref.id,
    type,
    source: {
      kind: mapKind(ref.source),
      uri: ref.src,
      mode: 'url',
    },
    metadata: {
      name: ref.name,
      mimeType: ref.mimeType,
    },
    lifecycle: { status: 'ready' },
  }
}

/**
 * Seeds / refreshes an AssetRepository from EkoDocument.assets (legacy AssetRef pools).
 * Does not mutate the document.
 */
export function syncDocumentAssetsToRepository(
  repository: AssetRepository,
  assets: DocumentAssets,
): void {
  repository.clear?.()

  for (const ref of assets.images) {
    repository.add(toCreateInput(ref, 'image'))
  }
  for (const ref of assets.backgrounds) {
    repository.add(toCreateInput(ref, 'image'))
  }
  for (const ref of assets.fonts) {
    repository.add(toCreateInput(ref, 'font'))
  }
}
