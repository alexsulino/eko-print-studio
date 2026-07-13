// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from '@/components/ErrorBoundary'

function Thrower(): null {
  throw new Error('render failure')
}

describe('ErrorBoundary', () => {
  let container: HTMLDivElement
  let root: Root

  afterEach(() => {
    act(() => root?.unmount())
    container?.remove()
  })

  it('shows fallback UI when a child throws', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    act(() => {
      root.render(
        <ErrorBoundary region="canvas">
          <Thrower />
        </ErrorBoundary>,
      )
    })

    expect(container.textContent).toContain('Eko Print Studio encontrou um erro de renderização')
    expect(container.textContent).toContain('O documento permanece protegido')
    expect(container.querySelector('.error-boundary')).toBeTruthy()

    errorSpy.mockRestore()
  })

  it('renders children when no error occurs', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root.render(
        <ErrorBoundary region="canvas">
          <p>Canvas OK</p>
        </ErrorBoundary>,
      )
    })

    expect(container.textContent).toContain('Canvas OK')
  })
})
