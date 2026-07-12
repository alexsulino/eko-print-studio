import { useMemo } from 'react'
import { PropertyEngine } from '@/core/properties/PropertyEngine'
import { PROPERTY_GROUPS } from '@/types/properties'
import { useEditorStore } from '@/store/editorStore'
import {
  AppearanceSection,
  ContentSection,
  TransformSection,
  TypographySection,
} from './sections'

export function PropertiesPanel() {
  const document = useEditorStore((s) => s.document)
  const selectedId = useEditorStore((s) => s.selectedId)
  const updateProperty = useEditorStore((s) => s.updateProperty)
  const lastError = useEditorStore((s) => s.lastError)

  const element = document?.elements.find((el) => el.id === selectedId) ?? null

  const grouped = useMemo(() => {
    if (!document || !element) return null
    const descriptors = PropertyEngine.getDescriptors(document, element)
    return PropertyEngine.groupDescriptors(descriptors)
  }, [document, element])

  if (!document) {
    return <aside className="properties-panel empty">Aguardando documento…</aside>
  }

  if (!element || !grouped) {
    return (
      <aside className="properties-panel empty">
        <h2>Propriedades</h2>
        <p>Selecione um elemento editável no canvas.</p>
        <p className="hint">
          Elementos <code>brand</code> / <code>system</code> bloqueados não podem ser selecionados.
        </p>
      </aside>
    )
  }

  const onChange = (path: string, value: unknown) => {
    updateProperty(element.id, path, value)
  }

  return (
    <aside className="properties-panel">
      <h2>Propriedades</h2>
      <dl className="prop-meta">
        <div>
          <dt>ID</dt>
          <dd>{element.id}</dd>
        </div>
        {element.slug && (
          <div>
            <dt>Slug</dt>
            <dd>{element.slug}</dd>
          </div>
        )}
        <div>
          <dt>Tipo</dt>
          <dd>{element.type}</dd>
        </div>
        <div>
          <dt>Categoria</dt>
          <dd>{element.category}</dd>
        </div>
        <div>
          <dt>Editable</dt>
          <dd>{element.editable ? 'sim' : 'não'}</dd>
        </div>
      </dl>

      {PROPERTY_GROUPS.map((group) => {
        const descriptors = grouped[group.id] ?? []
        if (!descriptors.length) return null
        if (group.id === 'transform') {
          return (
            <TransformSection
              key={group.id}
              title={group.label}
              descriptors={descriptors}
              onChange={onChange}
            />
          )
        }
        if (group.id === 'appearance') {
          return (
            <AppearanceSection
              key={group.id}
              title={group.label}
              descriptors={descriptors}
              onChange={onChange}
            />
          )
        }
        if (group.id === 'typography') {
          return (
            <TypographySection
              key={group.id}
              title={group.label}
              descriptors={descriptors}
              onChange={onChange}
            />
          )
        }
        return (
          <ContentSection
            key={group.id}
            title={group.label}
            descriptors={descriptors}
            onChange={onChange}
          />
        )
      })}

      {lastError && <p className="panel-error">{lastError}</p>}
    </aside>
  )
}
