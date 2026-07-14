import { Button } from '@/ui'
import { useEditorSession } from '@/sdk/react/EditorProvider'

/** Quick-add objects for Text / Shapes tabs — Commands via SDK. */
export function ElementsQuickAdd({ kind }: { kind: 'text' | 'shapes' }) {
  const session = useEditorSession()

  if (kind === 'text') {
    return (
      <div className="eko-panel-placeholder" data-testid="elements-text">
        <h2>Text</h2>
        <p>Adicione textos editáveis ao template.</p>
        <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.75rem' }}>
          <Button
            variant="primary"
            onClick={() =>
              session.createObject('text', {
                properties: { text: 'Título', fontFamily: 'Montserrat', fontSize: 36, fill: '#142033' },
                transform: { x: 80, y: 80, width: 320, height: 48, rotation: 0, scaleX: 1, scaleY: 1 },
              })
            }
          >
            Adicionar título
          </Button>
          <Button
            onClick={() =>
              session.createObject('text', {
                properties: { text: 'Texto do corpo', fontFamily: 'Roboto', fontSize: 18, fill: '#334155' },
                transform: { x: 80, y: 150, width: 280, height: 64, rotation: 0, scaleX: 1, scaleY: 1 },
              })
            }
          >
            Adicionar corpo
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="eko-panel-placeholder" data-testid="elements-shapes">
      <h2>Shapes</h2>
      <p>Formas básicas do Object Registry.</p>
      <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.75rem' }}>
        <Button
          variant="primary"
          onClick={() =>
            session.createObject('shape', {
              properties: { shape: 'rect', fill: '#8b3dff', cornerRadius: 8 },
              transform: { x: 100, y: 120, width: 160, height: 120, rotation: 0, scaleX: 1, scaleY: 1 },
            })
          }
        >
          Retângulo
        </Button>
        <Button
          onClick={() =>
            session.createObject('shape', {
              properties: { shape: 'circle', fill: '#0f6b4c' },
              transform: { x: 140, y: 160, width: 120, height: 120, rotation: 0, scaleX: 1, scaleY: 1 },
            })
          }
        >
          Círculo
        </Button>
      </div>
    </div>
  )
}
