import { describe, expect, it } from 'vitest'
import {
  AssetResolver,
  InMemoryAssetCache,
  InMemoryAssetRepository,
  type CreateAssetInput,
} from '@/core/assets'
import { createEmptyDocument } from '@/core/document/createDocument'

function sampleInput(overrides?: Partial<CreateAssetInput>): CreateAssetInput {
  return {
    id: 'asset_photo',
    type: 'image',
    source: { kind: 'local', uri: '/sample/demo-image.svg', mode: 'url' },
    metadata: { name: 'demo-image.svg', mimeType: 'image/svg+xml' },
    ...overrides,
  }
}

describe('AssetResolver', () => {
  it('resolves an existing asset to a url resource', () => {
    const repo = new InMemoryAssetRepository()
    repo.add(sampleInput())
    const resolver = new AssetResolver(repo)

    const result = resolver.resolve('asset_photo')

    expect(result.status).toBe('resolved')
    expect(result.asset?.id).toBe('asset_photo')
    expect(result.resource).toEqual({
      mode: 'url',
      uri: '/sample/demo-image.svg',
    })
    expect(result.error).toBeUndefined()
  })

  it('returns missing for unknown asset ids', () => {
    const resolver = new AssetResolver(new InMemoryAssetRepository())
    const result = resolver.resolve('does-not-exist')

    expect(result).toEqual({
      assetId: 'does-not-exist',
      status: 'missing',
    })
  })

  it('returns unresolved for draft lifecycle without throwing', () => {
    const repo = new InMemoryAssetRepository()
    repo.add(
      sampleInput({
        id: 'draft_asset',
        lifecycle: { status: 'draft' },
      }),
    )
    const resolver = new AssetResolver(repo)
    const result = resolver.resolve('draft_asset')

    expect(result.status).toBe('unresolved')
    expect(result.asset?.id).toBe('draft_asset')
    expect(result.resource).toBeUndefined()
  })

  it('resolution failure does not mutate the document', () => {
    const doc = createEmptyDocument({ id: 'doc_safe', type: 'session' })
    const before = structuredClone(doc)

    const brokenRepo = {
      get: () => {
        throw new Error('repository exploded')
      },
      add: () => {
        throw new Error('unused')
      },
      remove: () => false,
      list: () => [],
    }

    const resolver = new AssetResolver(brokenRepo)
    const result = resolver.resolve('any')

    expect(result.status).toBe('failed')
    expect(result.error).toContain('repository exploded')
    expect(doc).toEqual(before)
  })

  it('resolveMany maps each id independently', () => {
    const repo = new InMemoryAssetRepository()
    repo.add(sampleInput({ id: 'a' }))
    const resolver = new AssetResolver(repo)

    const results = resolver.resolveMany(['a', 'missing'])
    expect(results.map((r) => r.status)).toEqual(['resolved', 'missing'])
  })
})

describe('AssetCache', () => {
  it('stores and returns cached resolutions', () => {
    const cache = new InMemoryAssetCache()
    const repo = new InMemoryAssetRepository()
    repo.add(sampleInput())
    const resolver = new AssetResolver(repo, { cache })

    const first = resolver.resolve('asset_photo')
    expect(cache.has('asset_photo')).toBe(true)
    expect(cache.get('asset_photo')).toEqual(first)

    repo.remove('asset_photo')
    const second = resolver.resolve('asset_photo')
    expect(second).toBe(first)
    expect(second.status).toBe('resolved')
  })

  it('invalidate removes a cached entry so resolve refreshes', () => {
    const cache = new InMemoryAssetCache()
    const repo = new InMemoryAssetRepository()
    repo.add(sampleInput())
    const resolver = new AssetResolver(repo, { cache })

    resolver.resolve('asset_photo')
    cache.invalidate('asset_photo')
    expect(cache.has('asset_photo')).toBe(false)

    repo.remove('asset_photo')
    const refreshed = resolver.resolve('asset_photo')
    expect(refreshed.status).toBe('missing')
  })

  it('clear empties the entire cache', () => {
    const cache = new InMemoryAssetCache()
    cache.set('x', { assetId: 'x', status: 'missing' })
    cache.set('y', { assetId: 'y', status: 'missing' })
    cache.clear()
    expect(cache.has('x')).toBe(false)
    expect(cache.has('y')).toBe(false)
  })
})
