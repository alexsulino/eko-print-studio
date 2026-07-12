import { useMemo } from 'react'
import { LayerEngine } from '@/core/layers/LayerEngine'
import { useEditorStore } from '@/store/editorStore'

export function LayersPanel() {
  const document = useEditorStore((s) => s.document)
  const activeSurfaceId = useEditorStore((s) => s.activeSurfaceId)
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const selectElements = useEditorStore((s) => s.selectElements)
  const dispatch = useEditorStore((s) => s.dispatch)

  const layers = useMemo(() => {
    if (!document) return []
    return LayerEngine.listForSurface(document, activeSurfaceId)
  }, [document, activeSurfaceId])

  if (!document) {
    return (
      <aside className="layers-panel empty">
        <h2>Layers</h2>
        <p className="hint">Sem documento</p>
      </aside>
    )
  }

  const primary = selectedIds[selectedIds.length - 1]

  return (
    <aside className="layers-panel">
      <h2>Layers</h2>
      <div className="layers-actions">
        <button
          type="button"
          disabled={!primary}
          onClick={() =>
            primary &&
            dispatch({ type: 'BringForward', elementId: primary, timestamp: Date.now() })
          }
        >
          ↑
        </button>
        <button
          type="button"
          disabled={!primary}
          onClick={() =>
            primary &&
            dispatch({ type: 'SendBackward', elementId: primary, timestamp: Date.now() })
          }
        >
          ↓
        </button>
        <button
          type="button"
          disabled={!primary}
          onClick={() =>
            primary &&
            dispatch({ type: 'BringToFront', elementId: primary, timestamp: Date.now() })
          }
        >
          ⇈
        </button>
        <button
          type="button"
          disabled={!primary}
          onClick={() =>
            primary &&
            dispatch({ type: 'SendToBack', elementId: primary, timestamp: Date.now() })
          }
        >
          ⇊
        </button>
        <button
          type="button"
          disabled={selectedIds.length < 2}
          onClick={() =>
            dispatch({
              type: 'GroupElements',
              elementIds: selectedIds,
              timestamp: Date.now(),
            })
          }
        >
          Group
        </button>
        <button
          type="button"
          disabled={!primary || document.elements.find((el) => el.id === primary)?.type !== 'group'}
          onClick={() =>
            primary &&
            dispatch({ type: 'UngroupElements', groupId: primary, timestamp: Date.now() })
          }
        >
          Ungroup
        </button>
      </div>

      <ul className="layers-list">
        {layers.map((layer) => {
          const active = selectedIds.includes(layer.id)
          return (
            <li key={layer.id}>
              <button
                type="button"
                className={`layers-item${active ? ' is-active' : ''}${
                  !layer.effectivelyVisible ? ' is-hidden' : ''
                }`}
                style={{ paddingLeft: `${0.65 + layer.depth * 0.75}rem` }}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    selectElements(
                      selectedIds.includes(layer.id)
                        ? selectedIds.filter((id) => id !== layer.id)
                        : [...selectedIds, layer.id],
                    )
                    return
                  }
                  selectElements([layer.id])
                }}
              >
                <span className="layers-item-type">{layer.type}</span>
                <span className="layers-item-name">{layer.name}</span>
                <span className="layers-item-flags">
                  {layer.effectivelyLocked ? 'L' : ''}
                  {!layer.effectivelyVisible ? 'H' : ''}
                </span>
              </button>
              <div className="layers-item-toggles">
                <button
                  type="button"
                  title="Visibility"
                  onClick={() =>
                    dispatch({
                      type: 'SetVisibility',
                      elementId: layer.id,
                      visible: !layer.visible,
                      timestamp: Date.now(),
                    })
                  }
                >
                  {layer.visible ? 'V' : 'H'}
                </button>
                <button
                  type="button"
                  title="Lock"
                  onClick={() =>
                    dispatch({
                      type: 'SetLocked',
                      elementId: layer.id,
                      locked: !layer.locked,
                      timestamp: Date.now(),
                    })
                  }
                >
                  {layer.locked ? 'L' : 'U'}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
