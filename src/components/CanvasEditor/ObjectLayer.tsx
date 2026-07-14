import { memo, useCallback, useMemo } from 'react'
import type Konva from 'konva'
import type { EkoElement } from '@/types/element'
import { templateRulesEngine } from '@/core/rules/TemplateRulesEngine'
import { LayerEngine } from '@/core/layers/LayerEngine'
import { objectRegistry } from '@/core/registry/ObjectRegistry'
import type { EkoDocument } from '@/types/document'
import { recordReactRender } from '@/diagnostics/dragProfiler'
import { isProtectedElement } from '@/editor/layers/protectedElement'
import { TextNode } from './nodes/TextNode'
import { ImageNode } from './nodes/ImageNode'
import { ShapeNode } from './nodes/ShapeNode'

interface ObjectLayerProps {
  document: EkoDocument
  onSelect: (id: string, modifiers: { ctrlKey: boolean; shiftKey: boolean; metaKey: boolean }) => void
  onHover?: (id: string | null) => void
  onDragMove: (id: string, x: number, y: number) => { x: number; y: number }
  onDragEnd: (id: string, x: number, y: number) => void
  onEditStart?: (id: string) => void
  /** Element currently owned by an HTML overlay session (paint suppressed). */
  editingElementId?: string | null
  getNodeRef: (id: string) => (node: Konva.Node | null) => void
  listening: boolean
}

export function ObjectLayer({
  document,
  onSelect,
  onHover,
  onDragMove,
  onDragEnd,
  onEditStart,
  editingElementId,
  getNodeRef,
  listening,
}: ObjectLayerProps) {
  recordReactRender('ObjectLayer')
  const byId = useMemo(() => new Map(document.elements.map((el) => [el.id, el])), [document.elements])

  const sorted = useMemo(
    () => [...document.elements].sort((a, b) => a.zIndex - b.zIndex),
    [document.elements],
  )

  return (
    <>
      {sorted.map((element) => {
        if (element.type === 'group') return null
        const flags = LayerEngine.effectiveFlags(element, byId)
        if (!flags.visible) return null
        return (
          <ElementRenderer
            key={element.id}
            element={element}
            document={document}
            effectivelyLocked={flags.locked}
            onSelect={onSelect}
            onHover={onHover}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            onEditStart={onEditStart}
            suppressPaint={editingElementId === element.id}
            nodeRef={getNodeRef(element.id)}
            listening={listening}
          />
        )
      })}
    </>
  )
}

interface ElementRendererProps {
  element: EkoElement
  document: EkoDocument
  effectivelyLocked: boolean
  onSelect: ObjectLayerProps['onSelect']
  onHover?: ObjectLayerProps['onHover']
  onDragMove: ObjectLayerProps['onDragMove']
  onDragEnd: ObjectLayerProps['onDragEnd']
  onEditStart?: ObjectLayerProps['onEditStart']
  suppressPaint?: boolean
  nodeRef: (node: Konva.Node | null) => void
  listening: boolean
}

const ElementRenderer = memo(function ElementRenderer({
  element,
  document,
  effectivelyLocked,
  onSelect,
  onHover,
  onDragMove,
  onDragEnd,
  onEditStart,
  suppressPaint,
  nodeRef,
  listening,
}: ElementRendererProps) {
  recordReactRender('ElementRenderer')
  const canSelect = templateRulesEngine.can(element, 'select', document).allowed
  const canMove =
    !effectivelyLocked &&
    !suppressPaint &&
    templateRulesEngine.can(element, 'move', document).allowed

  const handleSelect = useCallback(
    (id: string, evt: { evt: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean } }) => {
      if (!canSelect) return
      const native = evt.evt
      onSelect(id, {
        ctrlKey: Boolean(native.ctrlKey),
        metaKey: Boolean(native.metaKey),
        shiftKey: Boolean(native.shiftKey),
      })
    },
    [canSelect, onSelect],
  )

  const handleHover = useCallback(
    (id: string | null) => {
      if (!canSelect && id) return
      onHover?.(id)
    },
    [canSelect, onHover],
  )

  const handleEditStart = useCallback(
    (id: string) => {
      onEditStart?.(id)
    },
    [onEditStart],
  )

  const common = {
    draggable: listening && canMove,
    /** Non-selectable nodes must not steal the hit graph (system guides, locked chrome). */
    listening: listening && canSelect,
    suppressPaint: Boolean(suppressPaint),
    interactionCursor: !canSelect
      ? undefined
      : isProtectedElement(element) || !canMove
        ? 'not-allowed'
        : 'move',
    onSelect: handleSelect,
    onHover: handleHover,
    onEditStart: handleEditStart,
    onDragMove,
    onDragEnd,
    nodeRef,
  }

  switch (objectRegistry.rendererKey(element.type)) {
    case 'text':
      // Variable elements also map to the text renderer key.
      if (element.type === 'text') {
        return <TextNode element={element} {...common} />
      }
      return null
    case 'image':
      if (element.type === 'image') {
        return <ImageNode element={element} {...common} />
      }
      return null
    case 'shape':
      if (element.type === 'shape') {
        return <ShapeNode element={element} {...common} />
      }
      return null
    case 'group':
    case 'frame':
    case 'table':
    case 'stub':
    case 'none':
      // Domain + RenderPipeline descriptors ready; Konva nodes land with dedicated UI.
      return null
    default:
      return null
  }
}, elementRendererEqual)

function elementRendererEqual(prev: ElementRendererProps, next: ElementRendererProps): boolean {
  return (
    prev.element === next.element &&
    prev.document === next.document &&
    prev.effectivelyLocked === next.effectivelyLocked &&
    prev.listening === next.listening &&
    prev.suppressPaint === next.suppressPaint &&
    prev.nodeRef === next.nodeRef &&
    prev.onSelect === next.onSelect &&
    prev.onHover === next.onHover &&
    prev.onEditStart === next.onEditStart &&
    prev.onDragMove === next.onDragMove &&
    prev.onDragEnd === next.onDragEnd
  )
}
