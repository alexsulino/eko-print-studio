export type InspectorEmptyKind = 'no-document' | 'none' | 'multi'

export interface InspectorEmptyStateProps {
  kind: InspectorEmptyKind
  selectionCount?: number
}

export function InspectorEmptyState({ kind, selectionCount = 0 }: InspectorEmptyStateProps) {
  if (kind === 'no-document') {
    return (
      <div className="eko-inspector-empty" data-testid="inspector-empty">
        <h2>Properties</h2>
        <p>Aguardando documento…</p>
      </div>
    )
  }

  if (kind === 'multi') {
    return (
      <div className="eko-inspector-empty" data-testid="inspector-empty-multi">
        <h2>Properties</h2>
        <p>
          <strong>{selectionCount}</strong> elementos selecionados.
        </p>
        <p className="eko-inspector-empty__hint">
          Multi-edit estará disponível em breve. Selecione um único elemento para editar
          propriedades.
        </p>
      </div>
    )
  }

  return (
    <div className="eko-inspector-empty" data-testid="inspector-empty">
      <h2>Properties</h2>
      <p>Selecione um elemento no canvas ou na árvore de layers.</p>
      <p className="eko-inspector-empty__hint">
        Elementos bloqueados por regras de template podem não ser selecionáveis.
      </p>
    </div>
  )
}
