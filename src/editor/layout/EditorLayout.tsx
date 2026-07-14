import { useCallback, useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import './editor-layout.css'

export interface EditorLayoutProps {
  toolbar: ReactNode
  left: ReactNode
  canvas: ReactNode
  right: ReactNode
  bottom: ReactNode
  canvasOverlay?: ReactNode
}

const LEFT_KEY = 'eko.layout.leftWidth'
const RIGHT_KEY = 'eko.layout.rightWidth'

/**
 * Fullscreen editor chrome — Canva-inspired, resizable side rails.
 * No document, Konva, or core imports.
 */
export function EditorLayout({
  toolbar,
  left,
  canvas,
  right,
  bottom,
  canvasOverlay,
}: EditorLayoutProps) {
  const [leftWidth, setLeftWidth] = useState(() => readWidth(LEFT_KEY, 260))
  const [rightWidth, setRightWidth] = useState(() => readWidth(RIGHT_KEY, 320))

  useEffect(() => {
    localStorage.setItem(LEFT_KEY, String(leftWidth))
  }, [leftWidth])

  useEffect(() => {
    localStorage.setItem(RIGHT_KEY, String(rightWidth))
  }, [rightWidth])

  const startResize = useCallback((side: 'left' | 'right', event: MouseEvent) => {
    event.preventDefault()
    const startX = event.clientX
    const startLeft = leftWidth
    const startRight = rightWidth

    const onMove = (ev: globalThis.MouseEvent) => {
      if (side === 'left') {
        setLeftWidth(clamp(startLeft + (ev.clientX - startX), 200, 420))
      } else {
        setRightWidth(clamp(startRight - (ev.clientX - startX), 240, 480))
      }
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [leftWidth, rightWidth])

  return (
    <div
      className="eko-editor-layout"
      data-testid="editor-layout"
      style={
        {
          '--eko-left-width': `${leftWidth}px`,
          '--eko-right-width': `${rightWidth}px`,
        } as CSSProperties
      }
    >
      <div className="eko-editor-layout__toolbar">{toolbar}</div>
      <div className="eko-editor-layout__workspace">
        <aside className="eko-editor-layout__left">{left}</aside>
        <div
          className="eko-editor-layout__resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionar painel esquerdo"
          onMouseDown={(e) => startResize('left', e)}
        />
        <section className="eko-editor-layout__canvas" aria-label="Canvas" data-eko-canvas>
          {canvas}
          {canvasOverlay ? <div className="eko-editor-layout__canvas-overlay">{canvasOverlay}</div> : null}
        </section>
        <div
          className="eko-editor-layout__resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionar inspector"
          onMouseDown={(e) => startResize('right', e)}
        />
        <aside className="eko-editor-layout__right">{right}</aside>
      </div>
      <div className="eko-editor-layout__bottom">{bottom}</div>
    </div>
  )
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function readWidth(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key)
    const n = raw ? Number(raw) : fallback
    return Number.isFinite(n) ? n : fallback
  } catch {
    return fallback
  }
}
