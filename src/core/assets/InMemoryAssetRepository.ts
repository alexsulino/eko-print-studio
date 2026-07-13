import { createId } from '@/utils/id'
import type { AssetRepository } from './AssetRepository'
import type { Asset, CreateAssetInput } from './types'
import { validateAsset } from './validateAsset'

function nowIso(): string {
  return new Date().toISOString()
}

function toAsset(input: CreateAssetInput | Asset): Asset {
  const validation = validateAsset(input)
  if (!validation.valid) {
    const detail = validation.errors.map((e) => e.message).join('; ')
    throw new Error(`Invalid asset: ${detail}`)
  }

  const createdAt = input.lifecycle?.createdAt ?? nowIso()
  const updatedAt = input.lifecycle?.updatedAt ?? createdAt

  return {
    id: ('id' in input && input.id ? input.id : createId('asset')),
    type: input.type,
    source: {
      kind: input.source.kind,
      uri: input.source.uri.trim(),
      ...(input.source.mode ? { mode: input.source.mode } : {}),
    },
    metadata: {
      name: input.metadata.name.trim(),
      mimeType: input.metadata.mimeType,
      width: input.metadata.width,
      height: input.metadata.height,
      originalName: input.metadata.originalName,
      extra: input.metadata.extra ? { ...input.metadata.extra } : undefined,
    },
    lifecycle: {
      status: input.lifecycle?.status ?? 'ready',
      createdAt,
      updatedAt,
      lastUsedAt: input.lifecycle?.lastUsedAt,
    },
  }
}

/**
 * Ephemeral AssetRepository for unit tests and editor sessions
 * before persistent backends land.
 */
export class InMemoryAssetRepository implements AssetRepository {
  private readonly assets = new Map<string, Asset>()

  add(input: CreateAssetInput | Asset): Asset {
    const asset = toAsset(input)
    if (this.assets.has(asset.id)) {
      throw new Error(`Asset already exists: ${asset.id}`)
    }
    this.assets.set(asset.id, asset)
    return asset
  }

  get(id: string): Asset | undefined {
    return this.assets.get(id)
  }

  remove(id: string): boolean {
    return this.assets.delete(id)
  }

  list(): Asset[] {
    return [...this.assets.values()]
  }

  update(
    id: string,
    patch: Partial<Pick<Asset, 'metadata' | 'lifecycle' | 'source'>>,
  ): Asset | undefined {
    const current = this.assets.get(id)
    if (!current) return undefined

    const next: Asset = {
      ...current,
      source: patch.source ? { ...current.source, ...patch.source } : current.source,
      metadata: patch.metadata ? { ...current.metadata, ...patch.metadata } : current.metadata,
      lifecycle: patch.lifecycle
        ? {
            ...current.lifecycle,
            ...patch.lifecycle,
            updatedAt: patch.lifecycle.updatedAt ?? nowIso(),
          }
        : { ...current.lifecycle, updatedAt: nowIso() },
    }

    const validation = validateAsset(next)
    if (!validation.valid) {
      const detail = validation.errors.map((e) => e.message).join('; ')
      throw new Error(`Invalid asset update: ${detail}`)
    }

    this.assets.set(id, next)
    return next
  }

  clear(): void {
    this.assets.clear()
  }
}
