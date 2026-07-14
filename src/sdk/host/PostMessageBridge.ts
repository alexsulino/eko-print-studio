import type { HostBridge, HostMessage } from '@/core/host/HostBridge'

export interface PostMessageBridgeOptions {
  /** Peer window (parent iframe host, or modal opener). */
  targetWindow: Window
  targetOrigin?: string
  /** Channel name used on HostMessage. */
  channel?: string
  /** Own window that listens for inbound messages. */
  listenWindow?: Window
}

/**
 * Binds HostBridge MessageBus ↔ browser postMessage.
 * Lives in SDK host layer — Core HostBridge itself stays browser-free.
 */
export function bindPostMessageTransport(
  host: HostBridge,
  options: PostMessageBridgeOptions,
): () => void {
  const channel = options.channel ?? 'eko.commerce'
  const origin = options.targetOrigin ?? '*'
  const listen = options.listenWindow ?? (typeof window !== 'undefined' ? window : null)

  const unsubscribe = host.bus.subscribe(channel, (message) => {
    options.targetWindow.postMessage(
      {
        source: 'eko-print-studio',
        ...message,
      },
      origin,
    )
  })

  const onMessage = (event: MessageEvent) => {
    if (origin !== '*' && event.origin !== origin) return
    const data = event.data as { source?: string; channel?: string; kind?: string; type?: string; payload?: unknown; id?: string }
    if (!data || data.source !== 'eko-print-studio-host') return
    if (data.channel && data.channel !== channel) return
    const message: HostMessage = {
      id: data.id,
      kind: (data.kind as HostMessage['kind']) ?? 'event',
      channel,
      type: data.type ?? 'message',
      payload: data.payload,
    }
    host.bus.publish(message)
    host.callbacks.emit(message.type, message.payload)
  }

  listen?.addEventListener('message', onMessage)

  return () => {
    unsubscribe()
    listen?.removeEventListener('message', onMessage)
  }
}

/** Helper for hosts posting into the editor iframe. */
export function postToEditor(
  editorWindow: Window,
  type: string,
  payload: unknown,
  targetOrigin = '*',
): void {
  editorWindow.postMessage(
    {
      source: 'eko-print-studio-host',
      channel: 'eko.commerce',
      kind: 'event',
      type,
      payload,
    },
    targetOrigin,
  )
}
