import type { ReactNode } from 'react'
import './editor-layout.css'

export interface EditorLayoutProps {
  toolbar: ReactNode
  left: ReactNode
  canvas: ReactNode
  right: ReactNode
  bottom: ReactNode
}

/**
 * Fullscreen editor chrome — Canva/Polotno-inspired regions only.
 * No document, Konva, or core imports.
 */
export function EditorLayout({ toolbar, left, canvas, right, bottom }: EditorLayoutProps) {
  return (
    <div className="eko-editor-layout" data-testid="editor-layout">
      <div className="eko-editor-layout__toolbar">{toolbar}</div>
      <div className="eko-editor-layout__workspace">
        <aside className="eko-editor-layout__left">{left}</aside>
        <section className="eko-editor-layout__canvas" aria-label="Canvas">
          {canvas}
        </section>
        <aside className="eko-editor-layout__right">{right}</aside>
      </div>
      <div className="eko-editor-layout__bottom">{bottom}</div>
    </div>
  )
}
