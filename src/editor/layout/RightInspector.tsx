import type { ReactNode } from 'react'

export interface RightInspectorProps {
  /** Existing PropertiesPanel (or future inspector sections). */
  propertiesContent?: ReactNode
}

/**
 * Right rail — inspector chrome. Content injected via slot.
 */
export function RightInspector({ propertiesContent }: RightInspectorProps) {
  return (
    <div className="eko-right-inspector" data-testid="right-inspector">
      <header className="eko-right-inspector__header">
        <h2>Inspector</h2>
        <span className="eko-right-inspector__badge">Properties</span>
      </header>
      <div className="eko-right-inspector__body">
        {propertiesContent ?? (
          <div className="eko-panel-placeholder">
            <h2>Properties</h2>
            <p>Selecione um elemento no canvas para editar propriedades.</p>
          </div>
        )}
      </div>
    </div>
  )
}
