import type {
  Asset,
  AssetLifecycleStatus,
  AssetSourceKind,
  AssetSourceMode,
  AssetType,
} from './types'

export const ASSET_TYPES: readonly AssetType[] = [
  'image',
  'svg',
  'font',
  'template',
  'external',
] as const

export const ASSET_SOURCE_KINDS: readonly AssetSourceKind[] = [
  'url',
  'local',
  'cdn',
  'wp-media',
  'api',
  'blob-ref',
] as const

export const ASSET_SOURCE_MODES: readonly AssetSourceMode[] = ['url', 'file', 'data'] as const

export const ASSET_LIFECYCLE_STATUSES: readonly AssetLifecycleStatus[] = [
  'draft',
  'ready',
  'missing',
  'orphaned',
  'archived',
] as const

/**
 * Lightweight schema descriptors for validation and future JSON Schema export.
 * Not a runtime validator — see `validateAsset`.
 */
export const AssetSchema = {
  version: '1.0.0',
  required: ['id', 'type', 'source', 'metadata', 'lifecycle'] as const,
  sourceRequired: ['kind', 'uri'] as const,
  metadataRequired: ['name'] as const,
  lifecycleRequired: ['status', 'createdAt', 'updatedAt'] as const,
  types: ASSET_TYPES,
  sourceKinds: ASSET_SOURCE_KINDS,
  sourceModes: ASSET_SOURCE_MODES,
  lifecycleStatuses: ASSET_LIFECYCLE_STATUSES,
} as const

export function isAssetType(value: unknown): value is AssetType {
  return typeof value === 'string' && (ASSET_TYPES as readonly string[]).includes(value)
}

export function isAssetSourceKind(value: unknown): value is AssetSourceKind {
  return typeof value === 'string' && (ASSET_SOURCE_KINDS as readonly string[]).includes(value)
}

export function isAssetSourceMode(value: unknown): value is AssetSourceMode {
  return typeof value === 'string' && (ASSET_SOURCE_MODES as readonly string[]).includes(value)
}

export function isAssetLifecycleStatus(value: unknown): value is AssetLifecycleStatus {
  return (
    typeof value === 'string' && (ASSET_LIFECYCLE_STATUSES as readonly string[]).includes(value)
  )
}

/** Type guard for a structurally complete Asset (does not run full validation). */
export function isAssetShape(value: unknown): value is Asset {
  if (!value || typeof value !== 'object') return false
  const a = value as Record<string, unknown>
  return (
    typeof a.id === 'string' &&
    isAssetType(a.type) &&
    typeof a.source === 'object' &&
    a.source !== null &&
    typeof a.metadata === 'object' &&
    a.metadata !== null &&
    typeof a.lifecycle === 'object' &&
    a.lifecycle !== null
  )
}
