import {
  isAssetLifecycleStatus,
  isAssetSourceKind,
  isAssetSourceMode,
  isAssetType,
} from './schema'
import type { Asset, CreateAssetInput } from './types'

export interface AssetValidationIssue {
  code: string
  message: string
  path?: string
}

export interface AssetValidationResult {
  valid: boolean
  errors: AssetValidationIssue[]
}

function push(
  errors: AssetValidationIssue[],
  code: string,
  message: string,
  path?: string,
): void {
  errors.push({ code, message, path })
}

function isIsoDate(value: string): boolean {
  const t = Date.parse(value)
  return !Number.isNaN(t)
}

/**
 * Validates an Asset or create payload.
 * Pure — no I/O, no document mutation.
 */
export function validateAsset(input: Asset | CreateAssetInput): AssetValidationResult {
  const errors: AssetValidationIssue[] = []

  if (!input || typeof input !== 'object') {
    return { valid: false, errors: [{ code: 'invalid_payload', message: 'Asset payload is required' }] }
  }

  if ('id' in input && input.id !== undefined) {
    if (typeof input.id !== 'string' || input.id.trim() === '') {
      push(errors, 'invalid_id', 'Asset id must be a non-empty string', 'id')
    }
  }

  if (!isAssetType(input.type)) {
    push(errors, 'invalid_type', `Unsupported asset type: ${String(input.type)}`, 'type')
  }

  if (!input.source || typeof input.source !== 'object') {
    push(errors, 'missing_source', 'Asset source is required', 'source')
  } else {
    if (!isAssetSourceKind(input.source.kind)) {
      push(
        errors,
        'invalid_source_kind',
        `Unsupported source kind: ${String(input.source.kind)}`,
        'source.kind',
      )
    }
    if (typeof input.source.uri !== 'string' || input.source.uri.trim() === '') {
      push(errors, 'invalid_source_uri', 'Asset source.uri must be a non-empty string', 'source.uri')
    }
    if (input.source.mode !== undefined && !isAssetSourceMode(input.source.mode)) {
      push(
        errors,
        'invalid_source_mode',
        `Unsupported source mode: ${String(input.source.mode)}`,
        'source.mode',
      )
    }
  }

  if (!input.metadata || typeof input.metadata !== 'object') {
    push(errors, 'missing_metadata', 'Asset metadata is required', 'metadata')
  } else {
    if (typeof input.metadata.name !== 'string' || input.metadata.name.trim() === '') {
      push(errors, 'invalid_metadata_name', 'Asset metadata.name is required', 'metadata.name')
    }
    if (
      input.metadata.width !== undefined &&
      (typeof input.metadata.width !== 'number' || input.metadata.width < 0)
    ) {
      push(errors, 'invalid_metadata_width', 'width must be a non-negative number', 'metadata.width')
    }
    if (
      input.metadata.height !== undefined &&
      (typeof input.metadata.height !== 'number' || input.metadata.height < 0)
    ) {
      push(
        errors,
        'invalid_metadata_height',
        'height must be a non-negative number',
        'metadata.height',
      )
    }
  }

  if (input.lifecycle) {
    if (
      input.lifecycle.status !== undefined &&
      !isAssetLifecycleStatus(input.lifecycle.status)
    ) {
      push(
        errors,
        'invalid_lifecycle_status',
        `Unsupported lifecycle status: ${String(input.lifecycle.status)}`,
        'lifecycle.status',
      )
    }
    if (
      input.lifecycle.createdAt !== undefined &&
      (typeof input.lifecycle.createdAt !== 'string' || !isIsoDate(input.lifecycle.createdAt))
    ) {
      push(
        errors,
        'invalid_created_at',
        'lifecycle.createdAt must be a valid ISO date string',
        'lifecycle.createdAt',
      )
    }
    if (
      input.lifecycle.updatedAt !== undefined &&
      (typeof input.lifecycle.updatedAt !== 'string' || !isIsoDate(input.lifecycle.updatedAt))
    ) {
      push(
        errors,
        'invalid_updated_at',
        'lifecycle.updatedAt must be a valid ISO date string',
        'lifecycle.updatedAt',
      )
    }
  }

  return { valid: errors.length === 0, errors }
}
