import { describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach } from 'vitest'
import { PropertyEngine } from '@/core/properties/PropertyEngine'
import { normalizeDocument } from '@/core/document/normalizeDocument'
import { cloneToSession } from '@/core/document/cloneToSession'
import { serializeDocument } from '@/core/document/serializeDocument'
import { sampleMasterTemplate } from '@/data/sampleDocuments'
import { InspectorEmptyState } from '@/editor/inspector/InspectorEmptyState'
import { InspectorSection } from '@/editor/inspector/InspectorSection'
import { PropertyField } from '@/editor/inspector/PropertyField'
import type { PropertyDescriptor } from '@/types/properties'

describe('Inspector — PropertyEngine command path', () => {
  it('creates UpdateProperty commands for text/shape/image fields', () => {
    const session = normalizeDocument(cloneToSession(serializeDocument(sampleMasterTemplate)))
    const text = session.elements.find((el) => el.type === 'text')
    const image = session.elements.find((el) => el.type === 'image')
    const shape = session.elements.find(
      (el) => el.type === 'shape' && el.editable && !el.locked,
    )
    expect(text && image).toBeTruthy()

    const textCmd = PropertyEngine.createUpdateCommand(
      session,
      text!.id,
      'properties.text',
      'Novo Nome',
    )
    expect(textCmd.success).toBe(true)
    if (textCmd.success) {
      expect(textCmd.command.type).toBe('UpdateProperty')
      expect(textCmd.command.path).toBe('properties.text')
    }

    if (shape) {
      const shapeCmd = PropertyEngine.createUpdateCommand(
        session,
        shape.id,
        'properties.fill',
        '#ff0000',
      )
      expect(shapeCmd.success).toBe(true)
    } else {
      // Session clone may keep brand shapes locked — still verify schema path exists.
      const schemaPaths = PropertyEngine.getDescriptors(
        session,
        session.elements.find((el) => el.type === 'shape')!,
      ).map((d) => d.path)
      expect(schemaPaths).toEqual(
        expect.arrayContaining(['properties.fill', 'properties.stroke', 'properties.opacity']),
      )
    }

    const imageCmd = PropertyEngine.createUpdateCommand(
      session,
      image!.id,
      'properties.opacity',
      0.5,
    )
    expect(imageCmd.success).toBe(true)
  })

  it('exposes descriptors for text typography and image src without mutating document', () => {
    const session = normalizeDocument(cloneToSession(serializeDocument(sampleMasterTemplate)))
    const before = structuredClone(session)
    const text = session.elements.find((el) => el.type === 'text')!
    const image = session.elements.find((el) => el.type === 'image')!

    const textPaths = PropertyEngine.getDescriptors(session, text).map((d) => d.path)
    expect(textPaths).toEqual(
      expect.arrayContaining([
        'properties.text',
        'properties.fontFamily',
        'properties.fontSize',
        'properties.align',
      ]),
    )

    const imagePaths = PropertyEngine.getDescriptors(session, image).map((d) => d.path)
    expect(imagePaths).toEqual(
      expect.arrayContaining(['properties.src', 'properties.opacity']),
    )

    expect(session).toEqual(before)
  })
})

describe('Inspector UI states', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root?.unmount())
    container?.remove()
  })

  it('renders empty and multi-select prepared states', () => {
    act(() => {
      root.render(<InspectorEmptyState kind="none" />)
    })
    expect(container.textContent).toContain('Selecione um elemento')

    act(() => {
      root.render(<InspectorEmptyState kind="multi" selectionCount={3} />)
    })
    expect(container.querySelector('[data-testid="inspector-empty-multi"]')).toBeTruthy()
    expect(container.textContent).toContain('3')
    expect(container.textContent).toContain('Multi-edit')
  })

  it('PropertyField renders controlled values from descriptors', () => {
    const onChange = vi.fn()
    const descriptor: PropertyDescriptor = {
      path: 'properties.text',
      key: 'text',
      label: 'Text',
      group: 'content',
      control: 'textarea',
      value: 'Hello',
      editable: true,
    }

    act(() => {
      root.render(
        <InspectorSection title="Content">
          <PropertyField descriptor={descriptor} onChange={onChange} />
        </InspectorSection>,
      )
    })

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    expect(textarea).toBeTruthy()
    expect(textarea.value).toBe('Hello')
    expect(textarea.disabled).toBe(false)
    expect(container.textContent).toContain('Content')
    expect(container.textContent).toContain('Text')
  })
})
