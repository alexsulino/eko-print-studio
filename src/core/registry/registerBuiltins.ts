import type {
  EkoElement,
  ElementAppearance,
  ElementBase,
  ElementLayout,
  ElementTransform,
  FrameElement,
  GroupElement,
  ImageElement,
  ObjectCapabilities,
  ShapeElement,
  StubElement,
  TableElement,
  TextElement,
  VariableElement,
} from '@/types/element'
import { createId } from '@/utils/id'
import { objectRegistry } from './ObjectRegistry'

function nowIso(): string {
  return new Date().toISOString()
}

function defaultTransform(overrides?: Partial<ElementTransform>): ElementTransform {
  return {
    x: 40,
    y: 40,
    width: 200,
    height: 80,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    originX: 0,
    originY: 0,
    ...overrides,
  }
}

function defaultAppearance(partial?: ElementAppearance): ElementAppearance {
  return {
    opacity: 1,
    ...partial,
  }
}

function defaultLayout(partial?: ElementLayout): ElementLayout {
  return {
    constraints: [],
    ...partial,
  }
}

function baseDefaults(partial?: Partial<ElementBase>): Omit<ElementBase, 'type' | 'id'> & {
  id?: string
} {
  const ts = nowIso()
  return {
    visible: true,
    locked: false,
    selectable: true,
    editable: true,
    zIndex: 0,
    metadata: {
      createdAt: ts,
      updatedAt: ts,
      ...partial?.metadata,
    },
    createdAt: partial?.createdAt ?? ts,
    updatedAt: partial?.updatedAt ?? ts,
    constraints: {
      selectable: true,
      move: true,
      resize: true,
      rotate: true,
      group: true,
      delete: true,
      ...partial?.constraints,
    },
    transform: defaultTransform(partial?.transform),
    appearance: defaultAppearance(partial?.appearance),
    layout: defaultLayout(partial?.layout),
    parentId: partial?.parentId ?? null,
    surfaceId: partial?.surfaceId ?? null,
    pageId: partial?.pageId ?? null,
    regionId: partial?.regionId ?? null,
    category: partial?.category ?? 'customer',
    name: partial?.name,
    slug: partial?.slug,
    ...partial,
  }
}

const CAP_TEXT: ObjectCapabilities = {
  rotate: true,
  resize: true,
  move: true,
  editText: true,
  acceptImage: false,
  groupable: true,
  effects: true,
  crop: false,
  delete: true,
  flip: true,
}

const CAP_IMAGE: ObjectCapabilities = {
  rotate: true,
  resize: true,
  move: true,
  editText: false,
  acceptImage: true,
  groupable: true,
  effects: true,
  crop: true,
  delete: true,
  flip: true,
}

const CAP_SHAPE: ObjectCapabilities = {
  rotate: true,
  resize: true,
  move: true,
  editText: false,
  acceptImage: false,
  groupable: true,
  effects: true,
  crop: false,
  delete: true,
  flip: true,
}

const CAP_GROUP: ObjectCapabilities = {
  rotate: true,
  resize: true,
  move: true,
  editText: false,
  acceptImage: false,
  groupable: true,
  effects: false,
  crop: false,
  delete: true,
  flip: true,
}

const CAP_STUB: ObjectCapabilities = {
  rotate: true,
  resize: true,
  move: true,
  editText: false,
  acceptImage: false,
  groupable: true,
  effects: true,
  crop: false,
  delete: true,
  flip: true,
}

function mergeBase<T extends EkoElement>(
  type: T['type'],
  partial: Partial<T> | undefined,
  defaults: ReturnType<typeof baseDefaults>,
): ElementBase & { type: T['type'] } {
  return {
    ...defaults,
    ...partial,
    id: partial?.id ?? createId(type === 'group' ? 'group' : 'el'),
    type,
    category: (partial?.category ?? defaults.category) as ElementBase['category'],
    name: partial?.name ?? defaults.name,
    transform: {
      ...defaults.transform,
      ...partial?.transform,
    },
    appearance: {
      ...defaults.appearance,
      ...partial?.appearance,
    },
    layout: {
      ...defaults.layout,
      ...partial?.layout,
    },
    metadata: {
      ...defaults.metadata,
      ...partial?.metadata,
      updatedAt: nowIso(),
    },
    constraints: {
      ...defaults.constraints,
      ...partial?.constraints,
    },
    createdAt: partial?.createdAt ?? defaults.createdAt,
    updatedAt: nowIso(),
  }
}

export function registerBuiltins(): void {
  objectRegistry.register<TextElement>({
    type: 'text',
    label: 'Text',
    icon: 'type',
    rendererKey: 'text',
    capabilities: CAP_TEXT,
    createDefault: (partial) => {
      const defaults = baseDefaults(partial)
      return {
        ...mergeBase('text', partial, defaults),
        name: partial?.name ?? 'Text',
        constraints: {
          ...defaults.constraints,
          changeText: true,
          changeFont: true,
          changeColor: true,
          ...partial?.constraints,
        },
        appearance: {
          ...defaults.appearance,
          fill: partial?.properties?.fill ?? '#111111',
        },
        properties: {
          text: 'Seu Nome',
          fontFamily: 'Montserrat',
          fontSize: 48,
          fill: '#111111',
          align: 'center',
          ...partial?.properties,
        },
      }
    },
  })

  objectRegistry.register<ImageElement>({
    type: 'image',
    label: 'Image',
    icon: 'image',
    rendererKey: 'image',
    capabilities: CAP_IMAGE,
    createDefault: (partial) => {
      const defaults = baseDefaults(partial)
      return {
        ...mergeBase('image', partial, {
          ...defaults,
          transform: defaultTransform({ width: 320, height: 320, ...partial?.transform }),
        }),
        name: partial?.name ?? 'Image',
        constraints: {
          ...defaults.constraints,
          replaceImage: true,
          crop: true,
          ...partial?.constraints,
        },
        properties: {
          src: '/sample/demo-image.svg',
          opacity: 1,
          ...partial?.properties,
        },
      }
    },
  })

  objectRegistry.register<ShapeElement>({
    type: 'shape',
    label: 'Shape',
    icon: 'square',
    rendererKey: 'shape',
    capabilities: CAP_SHAPE,
    createDefault: (partial) => {
      const defaults = baseDefaults(partial)
      return {
        ...mergeBase('shape', partial, {
          ...defaults,
          transform: defaultTransform({ width: 160, height: 160, ...partial?.transform }),
          category: partial?.category ?? 'product',
        }),
        name: partial?.name ?? 'Shape',
        constraints: {
          ...defaults.constraints,
          changeColor: true,
          ...partial?.constraints,
        },
        appearance: {
          fill: '#E8F1FF',
          stroke: '#2F6FED',
          strokeWidth: 2,
          cornerRadius: 8,
          opacity: 1,
          ...partial?.appearance,
        },
        properties: {
          shape: 'rect',
          fill: '#E8F1FF',
          stroke: '#2F6FED',
          strokeWidth: 2,
          cornerRadius: 8,
          ...partial?.properties,
        },
      }
    },
  })

  objectRegistry.register<GroupElement>({
    type: 'group',
    label: 'Group',
    icon: 'group',
    rendererKey: 'group',
    capabilities: CAP_GROUP,
    createDefault: (partial) => {
      const defaults = baseDefaults(partial)
      return {
        ...mergeBase('group', partial, defaults),
        name: partial?.name ?? 'Group',
        properties: {
          childIds: [],
          ...partial?.properties,
        },
      }
    },
  })

  objectRegistry.register<VariableElement>({
    type: 'variable',
    label: 'Variable',
    icon: 'braces',
    rendererKey: 'text',
    capabilities: { ...CAP_TEXT, editText: true },
    createDefault: (partial) => {
      const defaults = baseDefaults(partial)
      return {
        ...mergeBase('variable', partial, defaults),
        name: partial?.name ?? 'Variable',
        properties: {
          key: 'field',
          label: 'Field',
          fallback: '',
          ...partial?.properties,
        },
      }
    },
  })

  objectRegistry.register<FrameElement>({
    type: 'frame',
    label: 'Frame',
    icon: 'frame',
    rendererKey: 'frame',
    capabilities: CAP_GROUP,
    createDefault: (partial) => {
      const defaults = baseDefaults(partial)
      return {
        ...mergeBase('frame', partial, {
          ...defaults,
          transform: defaultTransform({ width: 400, height: 300, ...partial?.transform }),
        }),
        name: partial?.name ?? 'Frame',
        properties: {
          clipContent: true,
          background: '#ffffff',
          ...partial?.properties,
        },
      }
    },
  })

  objectRegistry.register<TableElement>({
    type: 'table',
    label: 'Table',
    icon: 'table',
    rendererKey: 'table',
    capabilities: { ...CAP_STUB, editText: true },
    createDefault: (partial) => {
      const defaults = baseDefaults(partial)
      return {
        ...mergeBase('table', partial, {
          ...defaults,
          transform: defaultTransform({ width: 320, height: 180, ...partial?.transform }),
        }),
        name: partial?.name ?? 'Table',
        properties: {
          rows: 3,
          columns: 3,
          ...partial?.properties,
        },
      }
    },
  })

  const stubs: Array<{
    type: StubElement['type']
    label: string
    icon: string
  }> = [
    { type: 'svg', label: 'SVG', icon: 'file-code' },
    { type: 'qr-code', label: 'QR Code', icon: 'qr-code' },
    { type: 'barcode', label: 'Barcode', icon: 'barcode' },
    { type: 'mask', label: 'Mask', icon: 'circle-dashed' },
    { type: 'mockup', label: 'Mockup', icon: 'shirt' },
  ]

  for (const stub of stubs) {
    objectRegistry.register<StubElement>({
      type: stub.type,
      label: stub.label,
      icon: stub.icon,
      rendererKey: 'stub',
      capabilities: CAP_STUB,
      createDefault: (partial) => {
        const defaults = baseDefaults(partial)
        return {
          ...mergeBase(stub.type, partial, defaults),
          name: partial?.name ?? stub.label,
          properties: {
            ...(partial?.properties ?? {}),
          },
        }
      },
    })
  }
}

/** Prefer registry factory; no-op safe when builtins already loaded. */
export function ensureBuiltinsRegistered(): void {
  if (!objectRegistry.has('text')) {
    registerBuiltins()
  }
}
