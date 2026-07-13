import { describe, expect, it } from 'vitest'
import {
  AssetSchema,
  InMemoryAssetRepository,
  findAssetUsage,
  findBrokenAssetReferences,
  findOrphanAssets,
  validateAsset,
  type CreateAssetInput,
} from '@/core/assets'
import { createEmptyDocument } from '@/core/document/createDocument'
import { normalizeDocument } from '@/core/document/normalizeDocument'
import type { ImageElement } from '@/types/element'

function sampleImageInput(overrides?: Partial<CreateAssetInput>): CreateAssetInput {
  return {
    id: 'asset_demo',
    type: 'image',
    source: { kind: 'local', uri: '/sample/demo-image.svg' },
    metadata: {
      name: 'demo-image.svg',
      mimeType: 'image/svg+xml',
      width: 200,
      height: 200,
    },
    ...overrides,
  }
}

function documentWithImage(assetId?: string) {
  const image: ImageElement = {
    id: 'el_img_1',
    type: 'image',
    category: 'customer',
    name: 'Photo',
    visible: true,
    locked: false,
    editable: true,
    zIndex: 0,
    transform: { x: 0, y: 0, width: 100, height: 100, rotation: 0, scaleX: 1, scaleY: 1 },
    metadata: {},
    constraints: { selectable: true, move: true },
    properties: {
      src: '/sample/demo-image.svg',
      ...(assetId ? { assetId } : {}),
    },
  }

  return normalizeDocument(
    createEmptyDocument({
      id: 'session_asset_test',
      type: 'session',
      elements: [image],
    }),
  )
}

describe('Asset schema & validation', () => {
  it('exposes schema version and supported types for future engines', () => {
    expect(AssetSchema.version).toBe('1.0.0')
    expect(AssetSchema.types).toContain('image')
    expect(AssetSchema.types).toContain('svg')
    expect(AssetSchema.types).toContain('font')
    expect(AssetSchema.types).toContain('template')
    expect(AssetSchema.types).toContain('external')
  })

  it('accepts a valid create payload', () => {
    const result = validateAsset(sampleImageInput())
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects missing source uri and empty name', () => {
    const result = validateAsset(
      sampleImageInput({
        source: { kind: 'url', uri: '   ' },
        metadata: { name: '' },
      }),
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.code === 'invalid_source_uri')).toBe(true)
    expect(result.errors.some((e) => e.code === 'invalid_metadata_name')).toBe(true)
  })

  it('rejects unknown asset type', () => {
    const result = validateAsset({
      ...sampleImageInput(),
      type: 'video' as CreateAssetInput['type'],
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.code === 'invalid_type')).toBe(true)
  })
})

describe('InMemoryAssetRepository', () => {
  it('creates and retrieves an asset', () => {
    const repo = new InMemoryAssetRepository()
    const asset = repo.add(sampleImageInput())

    expect(asset.id).toBe('asset_demo')
    expect(asset.lifecycle.status).toBe('ready')
    expect(repo.get('asset_demo')).toEqual(asset)
    expect(repo.list()).toHaveLength(1)
  })

  it('assigns an id when omitted', () => {
    const repo = new InMemoryAssetRepository()
    const asset = repo.add(sampleImageInput({ id: undefined }))
    expect(asset.id.startsWith('asset_')).toBe(true)
    expect(repo.get(asset.id)?.metadata.name).toBe('demo-image.svg')
  })

  it('removes an asset', () => {
    const repo = new InMemoryAssetRepository()
    repo.add(sampleImageInput())
    expect(repo.remove('asset_demo')).toBe(true)
    expect(repo.get('asset_demo')).toBeUndefined()
    expect(repo.remove('asset_demo')).toBe(false)
  })

  it('rejects duplicate ids', () => {
    const repo = new InMemoryAssetRepository()
    repo.add(sampleImageInput())
    expect(() => repo.add(sampleImageInput())).toThrow(/already exists/)
  })

  it('rejects invalid payloads on add', () => {
    const repo = new InMemoryAssetRepository()
    expect(() =>
      repo.add(
        sampleImageInput({
          source: { kind: 'cdn', uri: '' },
        }),
      ),
    ).toThrow(/Invalid asset/)
  })
})

describe('Asset usage & orphans', () => {
  it('finds element references by properties.assetId', () => {
    const repo = new InMemoryAssetRepository()
    repo.add(sampleImageInput({ id: 'img-demo' }))
    const doc = documentWithImage('img-demo')

    const usage = findAssetUsage(doc, 'img-demo')
    expect(usage).toEqual([
      {
        elementId: 'el_img_1',
        elementType: 'image',
        assetId: 'img-demo',
      },
    ])
  })

  it('detects orphan assets not referenced by any element', () => {
    const repo = new InMemoryAssetRepository()
    repo.add(sampleImageInput({ id: 'used' }))
    repo.add(sampleImageInput({ id: 'orphan', metadata: { name: 'orphan.svg' } }))
    const doc = documentWithImage('used')

    const orphans = findOrphanAssets(repo, doc)
    expect(orphans.map((a) => a.id)).toEqual(['orphan'])
  })

  it('detects broken element → asset references', () => {
    const repo = new InMemoryAssetRepository()
    const doc = documentWithImage('missing-asset')

    const broken = findBrokenAssetReferences(repo, doc)
    expect(broken).toEqual([
      {
        elementId: 'el_img_1',
        elementType: 'image',
        assetId: 'missing-asset',
      },
    ])
  })

  it('returns empty usage when element has no assetId', () => {
    const doc = documentWithImage(undefined)
    expect(findAssetUsage(doc, 'anything')).toEqual([])
  })
})
