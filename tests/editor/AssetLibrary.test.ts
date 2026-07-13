import { describe, expect, it } from 'vitest'
import { applyCommand } from '@/core/editor/commands'
import {
  createElementFromAsset,
  defaultInsertSize,
} from '@/core/assets/createElementFromAsset'
import {
  classifyLibraryKind,
  listDocumentLibraryAssets,
} from '@/core/assets/libraryAssets'
import { normalizeDocument } from '@/core/document/normalizeDocument'
import { cloneToSession } from '@/core/document/cloneToSession'
import { serializeDocument } from '@/core/document/serializeDocument'
import { getDocumentPixelSize } from '@/core/document/units'
import { sampleMasterTemplate } from '@/data/sampleDocuments'
import { buildLibraryCatalog } from '@/editor/assets/libraryCatalog'

function sessionDoc() {
  return normalizeDocument(cloneToSession(serializeDocument(sampleMasterTemplate)))
}

describe('library assets projection', () => {
  it('lists images and backgrounds, skips fonts', () => {
    const doc = sessionDoc()
    const list = listDocumentLibraryAssets(doc.assets)
    expect(list.every((a) => a.id !== 'font-montserrat')).toBe(true)
    expect(list.some((a) => a.id === 'img-demo')).toBe(true)
    expect(list.some((a) => a.id === 'bg-brasil-01')).toBe(true)
  })

  it('classifies svg mime as svg kind', () => {
    expect(classifyLibraryKind(undefined, 'image/svg+xml')).toBe('svg')
    expect(classifyLibraryKind('image', 'image/png')).toBe('image')
    expect(classifyLibraryKind('template')).toBe('template')
  })

  it('catalog merges placeholders without mutating document assets', () => {
    const doc = sessionDoc()
    const before = doc.assets.images.length
    const catalog = buildLibraryCatalog(doc.assets)
    expect(catalog.some((a) => a.kind === 'template')).toBe(true)
    expect(doc.assets.images.length).toBe(before)
  })
})

describe('createElementFromAsset', () => {
  it('creates image element with assetId for image/svg kinds', () => {
    const el = createElementFromAsset({
      assetId: 'img-demo',
      libraryKind: 'svg',
      sourceUri: '/sample/demo-image.svg',
      name: 'Demo',
      x: 10,
      y: 20,
      width: 100,
      height: 100,
    })
    expect(el.type).toBe('image')
    if (el.type === 'image') {
      expect(el.properties.assetId).toBe('img-demo')
      expect(el.properties.src).toBe('/sample/demo-image.svg')
    }
  })

  it('creates shape placeholder for template kind', () => {
    const el = createElementFromAsset({
      assetId: 'tpl_blank_placeholder',
      libraryKind: 'template',
      sourceUri: '#template/blank',
      name: 'Blank template',
      x: 0,
      y: 0,
      width: 240,
      height: 300,
    })
    expect(el.type).toBe('shape')
    expect(el.metadata.role).toBe('template-placeholder')
  })
})

describe('InsertAsset command', () => {
  it('inserts centered image on active surface and selects it', () => {
    const doc = sessionDoc()
    const surfaceId = doc.surfaces![0]!.id
    const beforeCount = doc.elements.length
    const { widthPx, heightPx } = getDocumentPixelSize(doc.canvas)
    const size = defaultInsertSize('svg')

    const result = applyCommand(doc, {
      type: 'InsertAsset',
      assetId: 'img-demo',
      libraryKind: 'svg',
      sourceUri: '/sample/demo-image.svg',
      name: 'demo-image.svg',
      mimeType: 'image/svg+xml',
      surfaceId,
      timestamp: Date.now(),
    })

    expect(result.success).toBe(true)
    expect(result.document.elements.length).toBe(beforeCount + 1)
    expect(result.selectedIds?.length).toBe(1)
    const id = result.selectedIds![0]!
    const el = result.document.elements.find((e) => e.id === id)!
    expect(el.type).toBe('image')
    expect(el.transform.x).toBe(Math.max(0, (widthPx - size.width) / 2))
    expect(el.transform.y).toBe(Math.max(0, (heightPx - size.height) / 2))
    expect(result.document.surfaces![0]!.elementIds).toContain(id)
  })

  it('rejects when template rules deny add', () => {
    const master = normalizeDocument(serializeDocument(sampleMasterTemplate))
    const surfaceId = master.surfaces![0]!.id
    const result = applyCommand(master, {
      type: 'InsertAsset',
      assetId: 'img-demo',
      libraryKind: 'image',
      sourceUri: '/sample/demo-image.svg',
      name: 'demo',
      surfaceId,
      timestamp: Date.now(),
    })
    expect(result.success).toBe(false)
  })
})
