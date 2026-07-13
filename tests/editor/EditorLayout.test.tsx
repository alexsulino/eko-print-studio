// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import {
  BottomStatusBar,
  EditorLayout,
  LeftSidebar,
  RightInspector,
  TopToolbar,
} from '@/editor/layout'

describe('Editor UX layout foundation', () => {
  let container: HTMLDivElement
  let root: Root

  afterEach(() => {
    act(() => root?.unmount())
    container?.remove()
  })

  function mount(node: React.ReactNode) {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => {
      root.render(node)
    })
  }

  it('renders the five chrome regions without canvas coupling', () => {
    mount(
      <EditorLayout
        toolbar={<TopToolbar documentTitle="Demo" />}
        left={<LeftSidebar />}
        canvas={<div data-testid="canvas-slot">canvas</div>}
        right={<RightInspector />}
        bottom={<BottomStatusBar pageInfo="Page 1" zoomLabel="Zoom 100%" />}
      />,
    )

    expect(container.querySelector('[data-testid="editor-layout"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="top-toolbar"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="left-sidebar"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="right-inspector"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="bottom-status-bar"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="canvas-slot"]')?.textContent).toBe('canvas')
  })

  it('switches left sidebar tabs between placeholders', () => {
    mount(<LeftSidebar />)

    const buttons = Array.from(
      container.querySelectorAll('.eko-left-sidebar__tab'),
    ) as HTMLButtonElement[]
    expect(buttons.map((b) => b.textContent)).toEqual(['Elements', 'Assets', 'Layers'])

    act(() => {
      buttons[0]?.click()
    })
    expect(container.textContent).toContain('Biblioteca de objetos')

    act(() => {
      buttons[1]?.click()
    })
    expect(container.textContent).toContain('Catálogo de assets')
  })

  it('renders AssetLibrary slot when assetsContent is provided', () => {
    mount(
      <LeftSidebar assetsContent={<div data-testid="assets-slot">library</div>} />,
    )
    const buttons = Array.from(
      container.querySelectorAll('.eko-left-sidebar__tab'),
    ) as HTMLButtonElement[]
    act(() => {
      buttons[1]?.click()
    })
    expect(container.querySelector('[data-testid="assets-slot"]')?.textContent).toBe('library')
  })
})
