import { createEmptyDocument, defaultPermissions } from '@/core/document/createDocument'
import { normalizeDocument } from '@/core/document/normalizeDocument'
import { objectRegistry } from '@/core/registry/ObjectRegistry'
import { registerBuiltins } from '@/core/registry/registerBuiltins'
import type { EkoDocument } from '@/types/document'
import type { EkoElement } from '@/types/element'
import { createId } from '@/utils/id'

export type BenchmarkSize = 'small' | 'medium' | 'large'

export const BENCHMARK_ELEMENT_COUNTS: Record<BenchmarkSize, number> = {
  small: 10,
  medium: 100,
  large: 500,
}

const MOCK_IMAGE_SRC = '/sample/demo-image.svg'
const NODE_TYPES = ['text', 'shape', 'image'] as const

let builtinsReady = false

function ensureBuiltins(): void {
  if (builtinsReady) return
  registerBuiltins()
  builtinsReady = true
}

function createBenchmarkElement(index: number, total: number): EkoElement {
  ensureBuiltins()
  const type = NODE_TYPES[index % NODE_TYPES.length]!
  const cols = Math.max(1, Math.ceil(Math.sqrt(total)))
  const cellW = 110
  const cellH = 90
  const col = index % cols
  const row = Math.floor(index / cols)

  const transform = {
    x: 20 + col * cellW,
    y: 20 + row * cellH,
    width: type === 'text' ? 100 : 80,
    height: type === 'text' ? 40 : 70,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
  }

  if (type === 'text') {
    return objectRegistry.get('text')!.createDefault({
      id: createId('el'),
      name: `Benchmark Text ${index + 1}`,
      zIndex: index,
      transform,
      properties: {
        text: `T${index + 1}`,
        fontSize: 14 + (index % 5) * 2,
        fill: index % 2 === 0 ? '#111111' : '#2F6FED',
      },
    })
  }

  if (type === 'image') {
    return objectRegistry.get('image')!.createDefault({
      id: createId('el'),
      name: `Benchmark Image ${index + 1}`,
      zIndex: index,
      transform,
      properties: {
        src: MOCK_IMAGE_SRC,
        assetId: `bench-img-${index}`,
        opacity: 0.85 + (index % 3) * 0.05,
      },
    })
  }

  return objectRegistry.get('shape')!.createDefault({
    id: createId('el'),
    name: `Benchmark Shape ${index + 1}`,
    zIndex: index,
    transform,
    properties: {
      shape: index % 3 === 0 ? 'circle' : index % 3 === 1 ? 'rect' : 'line',
      fill: index % 2 === 0 ? '#E8F1FF' : '#FFE8E8',
      stroke: '#2F6FED',
      strokeWidth: 2,
    },
  })
}

/** Builds a normalized session document with mixed Text / Shape / Image nodes. */
export function createBenchmarkDocument(size: BenchmarkSize): EkoDocument {
  const count = BENCHMARK_ELEMENT_COUNTS[size]
  const elements = Array.from({ length: count }, (_, index) => createBenchmarkElement(index, count))

  const now = new Date().toISOString()
  const doc = createEmptyDocument({
    id: createId('session'),
    type: 'session',
    metadata: {
      name: `Benchmark ${size} (${count} elements)`,
      productId: 'benchmark',
      createdAt: now,
      updatedAt: now,
    },
    permissions: defaultPermissions({
      canEdit: true,
      canSave: true,
      canAddElements: true,
      canDeleteElements: true,
      lockMaster: false,
    }),
    rules: {
      allowedFonts: ['Montserrat', 'Roboto', 'Bebas Neue'],
      allowedBackgrounds: [],
      allowAddElements: true,
      allowDeleteElements: true,
    },
    assets: {
      fonts: [],
      images: [
        {
          id: 'bench-mock-image',
          name: 'demo-image.svg',
          src: MOCK_IMAGE_SRC,
          mimeType: 'image/svg+xml',
          source: 'local',
        },
      ],
      backgrounds: [],
    },
    elements,
  })

  return normalizeDocument(doc)
}

export function countBenchmarkTypes(document: EkoDocument): Record<string, number> {
  const counts: Record<string, number> = { text: 0, shape: 0, image: 0 }
  for (const el of document.elements) {
    if (el.type in counts) counts[el.type]! += 1
  }
  return counts
}
