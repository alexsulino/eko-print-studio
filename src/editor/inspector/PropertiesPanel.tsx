import { useCallback, useMemo } from 'react'
import { PropertyEngine } from '@/core/properties/PropertyEngine'
import { PROPERTY_GROUPS } from '@/types/properties'
import type { ImageElement } from '@/types/element'
import { useEditorStore } from '@/store/editorStore'
import { InspectorEmptyState } from './InspectorEmptyState'
import { InspectorSection } from './InspectorSection'
import { PropertyField } from './PropertyField'
import './inspector.css'

/**
 * Right Inspector — observes Zustand selection; writes only via updateProperty → commands.
 */
export function PropertiesPanel() {
  const document = useEditorStore((s) => s.document)
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const selectedId = useEditorStore((s) => s.selectedId)
  const updateProperty = useEditorStore((s) => s.updateProperty)
  const lastError = useEditorStore((s) => s.lastError)

  const element =
    document && selectedId
      ? (document.elements.find((el) => el.id === selectedId) ?? null)
      : null

  const grouped = useMemo(() => {
    if (!document || !element) return null
    const descriptors = PropertyEngine.getDescriptors(document, element)
    return PropertyEngine.groupDescriptors(descriptors)
  }, [document, element])

  const onChange = useCallback(
    (path: string, value: unknown) => {
      if (!element) return
      updateProperty(element.id, path, value)
    },
    [element, updateProperty],
  )

  if (!document) {
    return (
      <aside className="eko-properties-panel" data-testid="properties-panel">
        <InspectorEmptyState kind="no-document" />
      </aside>
    )
  }

  if (selectedIds.length > 1) {
    return (
      <aside className="eko-properties-panel" data-testid="properties-panel">
        <InspectorEmptyState kind="multi" selectionCount={selectedIds.length} />
      </aside>
    )
  }

  if (!element || !grouped || selectedIds.length === 0) {
    return (
      <aside className="eko-properties-panel" data-testid="properties-panel">
        <InspectorEmptyState kind="none" />
      </aside>
    )
  }

  const imageAssetId =
    element.type === 'image'
      ? (element as ImageElement).properties.assetId
      : undefined

  return (
    <aside className="eko-properties-panel" data-testid="properties-panel">
      <header className="eko-properties-panel__header">
        <h2>Properties</h2>
        <span className="eko-properties-panel__type">{element.type}</span>
      </header>

      <dl className="eko-properties-panel__meta">
        <div>
          <dt>Name</dt>
          <dd>{element.name ?? element.slug ?? element.id}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{element.category}</dd>
        </div>
        {imageAssetId ? (
          <div>
            <dt>Asset</dt>
            <dd>
              <code>{imageAssetId}</code>
              <span className="eko-properties-panel__meta-hint"> · src fallback abaixo</span>
            </dd>
          </div>
        ) : null}
      </dl>

      {PROPERTY_GROUPS.map((group) => {
        const descriptors = grouped[group.id] ?? []
        if (!descriptors.length) return null
        return (
          <InspectorSection key={group.id} title={group.label}>
            {descriptors.map((descriptor) => (
              <PropertyField
                key={descriptor.path}
                descriptor={descriptor}
                onChange={onChange}
              />
            ))}
          </InspectorSection>
        )
      })}

      {lastError ? <p className="eko-properties-panel__error">{lastError}</p> : null}
    </aside>
  )
}
