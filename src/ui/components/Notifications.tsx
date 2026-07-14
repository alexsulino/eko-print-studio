import { useEffect, useState } from 'react'
import { platformEvents } from '@/sdk/EkoPrintStudio'
import type { ConfirmPayload, NotifyPayload } from '@/sdk/session/EditorSession'
import { useEditor } from '@/sdk/react/EditorProvider'
import { Button } from './Button'

interface ToastItem extends NotifyPayload {
  id: string
}

export function ToastHost() {
  const editor = useEditor()
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    return editor.on(platformEvents.Notify, (payload) => {
      const data = payload as NotifyPayload
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setToasts((prev) => [...prev, { ...data, id }])
      const duration = data.durationMs ?? 3200
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    })
  }, [editor])

  if (!toasts.length) return null

  return (
    <div className="eko-toast-host" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`eko-toast eko-toast--${toast.level === 'error' ? 'error' : toast.level === 'success' ? 'success' : 'info'}`}
          role="status"
        >
          <p className="eko-toast__title">{toast.title}</p>
          {toast.message ? <p className="eko-toast__message">{toast.message}</p> : null}
        </div>
      ))}
    </div>
  )
}

export function ConfirmHost() {
  const editor = useEditor()
  const [confirm, setConfirm] = useState<ConfirmPayload | null>(null)

  useEffect(() => {
    return editor.on(platformEvents.Confirm, (payload) => {
      setConfirm(payload as ConfirmPayload)
    })
  }, [editor])

  if (!confirm) return null

  return (
    <div className="eko-dialog-backdrop" role="presentation">
      <div className="eko-dialog" role="alertdialog" aria-modal="true" aria-labelledby="eko-confirm-title">
        <h2 id="eko-confirm-title">{confirm.title}</h2>
        <p>{confirm.message}</p>
        <div className="eko-dialog__actions">
          <Button variant="ghost" onClick={() => setConfirm(null)}>
            {confirm.cancelLabel ?? 'Cancelar'}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              editor.session().notify({
                level: 'info',
                title: 'Confirmado',
                message: confirm.id,
              })
              setConfirm(null)
            }}
          >
            {confirm.confirmLabel ?? 'Confirmar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
