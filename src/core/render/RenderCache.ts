import type { DirtyRegion } from './types'

export type RenderCacheKind = 'bitmap' | 'text' | 'svg' | 'image'

interface CacheEntry {
  kind: RenderCacheKind
  key: string
  /** Opaque payload owned by graphics adapters (ArrayBuffer, string, etc.). */
  payload: unknown
  revision: number
  createdAt: number
}

/**
 * Infrastructure for bitmap / text / SVG / image caches + dirty regions.
 * Partial rendering consumers may use this even when empty.
 */
export class RenderCache {
  private entries = new Map<string, CacheEntry>()
  private dirty: DirtyRegion[] = []

  get(kind: RenderCacheKind, key: string): CacheEntry | undefined {
    return this.entries.get(cacheId(kind, key))
  }

  set(kind: RenderCacheKind, key: string, payload: unknown, revision = 0): void {
    this.entries.set(cacheId(kind, key), {
      kind,
      key,
      payload,
      revision,
      createdAt: Date.now(),
    })
  }

  invalidate(kind: RenderCacheKind, key: string): void {
    this.entries.delete(cacheId(kind, key))
  }

  invalidateAll(): void {
    this.entries.clear()
  }

  markDirty(region: DirtyRegion): void {
    this.dirty.push(region)
  }

  consumeDirtyRegions(): DirtyRegion[] {
    const next = this.dirty
    this.dirty = []
    return next
  }

  size(): number {
    return this.entries.size
  }
}

export const renderCache = new RenderCache()

function cacheId(kind: RenderCacheKind, key: string): string {
  return `${kind}:${key}`
}
