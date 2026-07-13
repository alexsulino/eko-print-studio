export type {
  Asset,
  AssetLifecycle,
  AssetLifecycleStatus,
  AssetMetadata,
  AssetSource,
  AssetSourceKind,
  AssetSourceMode,
  AssetType,
  AssetUsageRef,
  CreateAssetInput,
} from './types'

export {
  ASSET_LIFECYCLE_STATUSES,
  ASSET_SOURCE_KINDS,
  ASSET_SOURCE_MODES,
  ASSET_TYPES,
  AssetSchema,
  isAssetLifecycleStatus,
  isAssetShape,
  isAssetSourceKind,
  isAssetSourceMode,
  isAssetType,
} from './schema'

export { validateAsset } from './validateAsset'
export type { AssetValidationIssue, AssetValidationResult } from './validateAsset'

export type { AssetRepository } from './AssetRepository'
export { InMemoryAssetRepository } from './InMemoryAssetRepository'

export {
  findAssetUsage,
  findBrokenAssetReferences,
  findOrphanAssets,
} from './findAssetUsage'

export type { AssetResolveStatus, ResolvedAsset, ResolvedResource } from './ResolvedAsset'
export type { AssetCache } from './AssetCache'
export { InMemoryAssetCache } from './InMemoryAssetCache'
export { AssetResolver, materializeResource } from './AssetResolver'
export type { AssetResolverOptions } from './AssetResolver'

export { resolveImageResource } from './imageAssetAdapter'
export type {
  ImageResourceRequest,
  ImageResourceResult,
  ImageResourceStatus,
} from './imageAssetAdapter'

export { syncDocumentAssetsToRepository } from './documentAssetsBridge'

export {
  classifyLibraryKind,
  listDocumentLibraryAssets,
} from './libraryAssets'
export type { LibraryAssetEntry, LibraryAssetKind } from './libraryAssets'

export {
  createElementFromAsset,
  defaultInsertSize,
} from './createElementFromAsset'
export type { CreateElementFromAssetInput } from './createElementFromAsset'
