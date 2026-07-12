import { useMemo } from 'react'
import type Konva from 'konva'
import type { EkoElement } from '@/types/element'
import { templateRulesEngine } from '@/core/rules/TemplateRulesEngine'
import type { EkoDocument } from '@/types/document'
import { TextNode } from './nodes/TextNode'
import { ImageNode } from './nodes/ImageNode'
import { ShapeNode } from './nodes/ShapeNode'

interface ObjectLayerProps {
  document: EkoDocument
  onSelect: (id: string) => void
  onDragEnd: (id: string, x: number, y: number) => void
  onNodeRef: (id: string, node: Konva.Node | null) => void
}

export function ObjectLayer({ document, onSelect, onDragEnd, onNodeRef }: ObjectLayerProps) {
  const sorted = useMemo(
    () => [...document.elements].sort((a, b) => a.zIndex - b.zIndex),
    [document.elements],
  )

  return (
    <>
      {sorted.map((element) => {
        if (!element.visible) return null
        return (
          <ElementRenderer
            key={element.id}
            element={element}
            document={document}
            onSelect={onSelect}
            onDragEnd={onDragEnd}
            onNodeRef={onNodeRef}
          />
        )
      })}
    </>
  )
}

function ElementRenderer({
  element,
  document,
  onSelect,
  onDragEnd,
  onNodeRef,
}: {
  element: EkoElement
  document: EkoDocument
  onSelect: (id: string) => void
  onDragEnd: (id: string, x: number, y: number) => void
  onNodeRef: (id: string, node: Konva.Node | null) => void
}) {
  const canSelect = templateRulesEngine.can(element, 'select', document).allowed
  const canMove = templateRulesEngine.can(element, 'move', document).allowed

  const handleSelect = (id: string) => {
    if (!canSelect) return
    onSelect(id)
  }

  const common = {
    draggable: canMove,
    onSelect: handleSelect,
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
