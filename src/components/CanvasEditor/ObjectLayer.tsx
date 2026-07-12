import { useMemo } from 'react'
import type Konva from 'konva'
import type { EkoElement } from '@/types/element'
import { templateRulesEngine } from '@/core/rules/TemplateRulesEngine'
import { LayerEngine } from '@/core/layers/LayerEngine'
import type { EkoDocument } from '@/types/document'
import { TextNode } from './nodes/TextNode'
import { ImageNode } from './nodes/ImageNode'
import { ShapeNode } from './nodes/ShapeNode'

interface ObjectLayerProps {
  document: EkoDocument
  selectedIds: string[]
  onSelect: (id: string, modifiers: { ctrlKey: boolean; shiftKey: boolean; metaKey: boolean }) => void
  onDragMove: (id: string, x: number, y: number) => { x: number; y: number }
  onDragEnd: (id: string, x: number, y: number) => void
  onNodeRef: (id: string, node: Konva.Node | null) => void
  listening: boolean
}

export function ObjectLayer({
  document,
  selectedIds,
  onSelect,
  onDragMove,
  onDragEnd,
  onNodeRef,
  listening,
}: ObjectLayerProps) {
  // Full element map for hierarchy flags (group parents may be present alongside children).
  const byId = useMemo(() => new Map(document.elements.map((el) => [el.id, el])), [document.elements])

  const sorted = useMemo(
    () => [...document.elements].sort((a, b) => a.zIndex - b.zIndex),
    [document.elements],
  )

  return (
    <>
      {sorted.map((element) => {
        // Groups are structural only — children are expanded by LayoutResolver.
        if (element.type === 'group') return null
        const flags = LayerEngine.effectiveFlags(element, byId)
        if (!flags.visible) return null
        return (
          <ElementRenderer
            key={element.id}
            element={element}
            document={document}
            selected={selectedIds.includes(element.id)}
            effectivelyLocked={flags.locked}
            onSelect={onSelect}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            onNodeRef={onNodeRef}
            listening={listening}
          />
        )
      })}
    </>
  )
}

function ElementRenderer({
  element,
  document,
  selected,
  effectivelyLocked,
  onSelect,
  onDragMove,
  onDragEnd,
  onNodeRef,
  listening,
}: {
  element: EkoElement
  document: EkoDocument
  selected: boolean
  effectivelyLocked: boolean
  onSelect: ObjectLayerProps['onSelect']
  onDragMove: ObjectLayerProps['onDragMove']
  onDragEnd: ObjectLayerProps['onDragEnd']
  onNodeRef: ObjectLayerProps['onNodeRef']
  listening: boolean
}) {
  const canSelect = templateRulesEngine.can(element, 'select', document).allowed
  const canMove =
    !effectivelyLocked && templateRulesEngine.can(element, 'move', document).allowed

  const handleSelect = (id: string, evt: { evt: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean } }) => {
    if (!canSelect) return
    const native = evt.evt
    onSelect(id, {
      ctrlKey: Boolean(native.ctrlKey),
      metaKey: Boolean(native.metaKey),
      shiftKey: Boolean(native.shiftKey),
    })
  }

  const common = {
    draggable: listening && canMove,
    selected,
    onSelect: handleSelect,
    onDragMove,
    onDragEnd,
    onNodeRef,
  }

  switch (element.type) {
    case 'text':
      return <TextNode element={element} {...common} />
    case 'image':
      return <ImageNode element={element} {...common} />
    case 'shape':
      return <ShapeNode element={element} {...common} />
    default:
      return null
  }
}
