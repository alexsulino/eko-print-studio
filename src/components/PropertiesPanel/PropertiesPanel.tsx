import { useEditorStore } from '@/store/editorStore'
import type { TextElement } from '@/types/element'

export function PropertiesPanel() {
  const document = useEditorStore((s) => s.document)
  const selectedId = useEditorStore((s) => s.selectedId)
  const updateElementProperties = useEditorStore((s) => s.updateElementProperties)
  const lastError = useEditorStore((s) => s.lastError)

  const element = document?.elements.find((el) => el.id === selectedId) ?? null

  if (!document) {
    return <aside className="properties-panel empty">Aguardando documento…</aside>
  }

  if (!element) {
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

      {element.type === 'text' && (
        <TextProperties
          element={element}
          fonts={document.rules.allowedFonts}
          onChange={(properties) => updateElementProperties(element.id, properties)}
        />
      )}

      {element.type === 'image' && (
        <label className="field">
          <span>SRC da imagem</span>
          <input
            value={element.properties.src}
            onChange={(e) => updateElementProperties(element.id, { src: e.target.value })}
          />
        </label>
      )}

      {element.type === 'shape' && (
        <>
          <label className="field">
            <span>Fill</span>
            <input
              type="color"
              value={normalizeColor(element.properties.fill)}
              onChange={(e) => updateElementProperties(element.id, { fill: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Stroke</span>
            <input
              type="color"
              value={normalizeColor(element.properties.stroke)}
              onChange={(e) => updateElementProperties(element.id, { stroke: e.target.value })}
            />
          </label>
        </>
      )}

      {lastError && <p className="panel-error">{lastError}</p>}
    </aside>
  )
}

function TextProperties({
  element,
  fonts,
  onChange,
}: {
  element: TextElement
  fonts: string[]
  onChange: (properties: Record<string, unknown>) => void
}) {
  return (
    <div className="prop-fields">
      <label className="field">
        <span>Texto</span>
        <textarea
          rows={3}
          value={element.properties.text}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Fonte</span>
        <select
          value={element.properties.fontFamily}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
        >
          {fonts.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Tamanho</span>
        <input
          type="number"
          min={8}
          value={element.properties.fontSize}
          onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
        />
      </label>
      <label className="field">
        <span>Cor</span>
        <input
          type="color"
          value={normalizeColor(element.properties.fill)}
          onChange={(e) => onChange({ fill: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Alinhamento</span>
        <select
          value={element.properties.align ?? 'left'}
          onChange={(e) => onChange({ align: e.target.value })}
        >
          <option value="left">Esquerda</option>
          <option value="center">Centro</option>
          <option value="right">Direita</option>
        </select>
      </label>
    </div>
  )
}

function normalizeColor(value?: string): string {
  if (!value) return '#000000'
  if (value.startsWith('#') && (value.length === 7 || value.length === 4)) return value
  return '#000000'
}
