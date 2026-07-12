type EventHandler<T = unknown> = (payload: T) => void

/**
 * Lightweight Event Bus — notifications only.
 * Does NOT mutate documents. Commands remain the mutation path.
 */
export class EventBus {
  private listeners = new Map<string, Set<EventHandler>>()

  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    const set = this.listeners.get(event) ?? new Set()
    set.add(handler as EventHandler)
    this.listeners.set(event, set)
    return () => this.off(event, handler)
  }

  off<T = unknown>(event: string, handler: EventHandler<T>): void {
    this.listeners.get(event)?.delete(handler as EventHandler)
  }

  emit<T = unknown>(event: string, payload: T): void {
    const set = this.listeners.get(event)
    if (!set) return
    for (const handler of set) {
      handler(payload)
    }
  }

  clear(): void {
    this.listeners.clear()
  }
}

export const documentEvents = {
  ELEMENT_CREATED: 'element.created',
  ELEMENT_UPDATED: 'element.updated',
  ELEMENT_SELECTED: 'element.selected',
  ELEMENT_REMOVED: 'element.removed',
  DOCUMENT_CHANGED: 'document.changed',
  LAYOUT_CHANGED: 'layout.changed',
} as const

export const eventBus = new EventBus()
