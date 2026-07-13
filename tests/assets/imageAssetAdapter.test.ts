import { describe, expect, it } from 'vitest'
import {
  AssetResolver,
  InMemoryAssetRepository,
  resolveImageResource,
  syncDocumentAssetsToRepository,
} from '@/core/assets'
import type { DocumentAssets } from '@/types/document'

describe('resolveImageResource adapter', () => {
  it('uses legacy src when assetId is absent', () => {
    const result = resolveImageResource({ fallbackSrc: '/legacy.png' }, null)
    expect(result).toEqual({
      status: 'resolved',
      uri: '/legacy.png',
      usedFallback: false,
    })
  })

  it('resolves assetId via AssetResolver', () => {
    const repo = new InMemoryAssetRepository()
    repo.add({
      id: 'img-1',
      type: 'image',
      source: { kind: 'local', uri: '/from-asset.svg', mode: 'url' },
      metadata: { name: 'from-asset.svg' },
    })
    const resolver = new AssetResolver(repo)

    const result = resolveImageResource(
      { assetId: 'img-1', fallbackSrc: '/legacy.png' },
      resolver,
    )

    expect(result.status).toBe('resolved')
    expect(result.uri).toBe('/from-asset.svg')
    expect(result.usedFallback).toBe(false)
  })

  it('falls back to src when asset is missing', () => {
    const resolver = new AssetResolver(new InMemoryAssetRepository())
    const result = resolveImageResource(
      { assetId: 'missing', fallbackSrc: '/legacy.png' },
      resolver,
    )

    expect(result.status).toBe('resolved')
    expect(result.uri).toBe('/legacy.png')
    expect(result.usedFallback).toBe(true)
    expect(result.resolved?.status).toBe('missing')
  })

  it('falls back to src when resolver throws', () => {
    const broken = {
      get: () => {
        throw new Error('boom')
      },
      add: () => {
        throw new Error('unused')
      },
      remove: () => false,
      list: () => [],
    }
    const resolver = new AssetResolver(broken)
    const result = resolveImageResource(
      { assetId: 'x', fallbackSrc: '/safe.png' },
      resolver,
    )

    expect(result.status).toBe('resolved')
    expect(result.uri).toBe('/safe.png')
    expect(result.usedFallback).toBe(true)
  })

  it('returns missing when assetId fails and no fallback exists', () => {
    const resolver = new AssetResolver(new InMemoryAssetRepository())
    const result = resolveImageResource({ assetId: 'gone' }, resolver)
    expect(result.status).toBe('missing')
    expect(result.uri).toBeUndefined()
  })

  it('updates URI when assetId target changes in repository', () => {
    const repo = new InMemoryAssetRepository()
    repo.add({
      id: 'img-1',
      type: 'image',
      source: { kind: 'local', uri: '/a.svg', mode: 'url' },
      metadata: { name: 'a' },
    })
    const resolver = new AssetResolver(repo)

    expect(resolveImageResource({ assetId: 'img-1' }, resolver).uri).toBe('/a.svg')

    repo.update('img-1', {
      source: { kind: 'local', uri: '/b.svg', mode: 'url' },
    })
    // No cache — fresh resolve
    expect(resolveImageResource({ assetId: 'img-1' }, resolver).uri).toBe('/b.svg')
  })
})

describe('syncDocumentAssetsToRepository', () => {
  it('bridges DocumentAssets into the AssetRepository for ImageNode resolution', () => {
    const assets: DocumentAssets = {
      fonts: [],
      backgrounds: [],
      images: [
        {
          id: 'img-demo',
          name: 'demo',
          src: '/sample/demo-image.svg',
          mimeType: 'image/svg+xml',
          source: 'local',
        },
      ],
    }
    const repo = new InMemoryAssetRepository()
    syncDocumentAssetsToRepository(repo, assets)

    const resolver = new AssetResolver(repo)
    const result = resolveImageResource(
      { assetId: 'img-demo', fallbackSrc: '/other.png' },
      resolver,
    )
    expect(result.uri).toBe('/sample/demo-image.svg')
    expect(result.usedFallback).toBe(false)
  })
})
