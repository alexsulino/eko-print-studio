import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { TextElement } from '@/types/element'
import {
  computeElementScreenBox,
  elementScreenBoxCssTransform,
} from '@/core/coordinates/ElementScreenBox'
import type { ViewportState } from '@/types/viewport'
import './text-edit-overlay.css'

export interface TextEditOverlayProps {
  element: TextElement
  viewport: Pick<ViewportState, 'zoom' | 'panX' | 'panY'>
  /** Called once with final text (or same value). Parent decides PropertyEngine commit. */
  onCommit: (nextText: string) => void
  onCancel: () => void
}

function fontCss(fontStyle: TextElement['properties']['fontStyle']): {
  fontWeight: CSSProperties['fontWeight']
  fontStyle: CSSProperties['fontStyle']
} {
  const value = fontStyle ?? 'normal'
  return {
    fontWeight: value.includes('bold') ? 700 : 400,
    fontStyle: value.includes('italic') ? 'italic' : 'normal',
  }
}

/**
 * HTML textarea over the canvas text node.
 * Draft / caret / height live ONLY here — never in Zustand.
 */
export function TextEditOverlay({
  element,
  viewport,
  onCommit,
  onCancel,
}: TextEditOverlayProps) {
  const [draft, setDraft] = useState(element.properties.text)
  const draftRef = useRef(draft)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const closedRef = useRef(false)

  draftRef.current = draft

  const box = computeElementScreenBox(element.transform, viewport)
  const font = fontCss(element.properties.fontStyle)

  const style: CSSProperties = {
    left: box.left,
    top: box.top,
    width: Math.max(1, box.width),
    height: Math.max(1, box.height),
    transform: elementScreenBoxCssTransform(box),
    transformOrigin: 'top left',
    fontFamily: element.properties.fontFamily,
    fontSize: element.properties.fontSize * box.zoom,
    fontWeight: font.fontWeight,
    fontStyle: font.fontStyle,
    color: element.properties.fill,
    textAlign: element.properties.align ?? 'left',
    lineHeight: element.properties.lineHeight ?? 1.2,
    letterSpacing: element.properties.letterSpacing
      ? element.properties.letterSpacing * box.zoom
      : undefined,
  }

  useLayoutEffect(() => {
    const node = textareaRef.current
    if (!node) return
    node.focus()
    node.select()
  }, [])

  useEffect(() => {
    closedRef.current = false
  }, [element.id])

  const finish = (mode: 'commit' | 'cancel') => {
    if (closedRef.current) return
    closedRef.current = true
    if (mode === 'cancel') {
      onCancel()
      return
    }
    onCommit(draftRef.current)
  }

  return (
    <textarea
      ref={textareaRef}
      className="eko-text-edit-overlay"
      data-testid="text-edit-overlay"
      data-element-id={element.id}
      value={draft}
      style={style}
      spellCheck={false}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => finish('commit')}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          finish('cancel')
          return
        }
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          e.stopPropagation()
          finish('commit')
        }
      }}
    />
  )
}
