type EventHandler<T = unknown> = (payload: T) => void

/**
 * Lightweight Event Bus — notifications only.
 * Does NOT mutate documents. Commands remain the mutation path.
 * Consumable by any host (React, Vue, WooCommerce adapter, iframe, …).
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

/** Legacy document event names — kept for compatibility. */
export const documentEvents = {
  ELEMENT_CREATED: 'element.created',
  ELEMENT_UPDATED: 'element.updated',
  ELEMENT_SELECTED: 'element.selected',
  ELEMENT_REMOVED: 'element.removed',
  DOCUMENT_CHANGED: 'document.changed',
  LAYOUT_CHANGED: 'layout.changed',
} as const

/**
 * Platform event catalog — hosts subscribe via `editor.on(platformEvents.*)`.
 * Aliases map friendly SDK names onto stable wire strings.
 */
export const platformEvents = {
  DocumentOpened: 'document.opened',
  DocumentSaved: 'document.saved',
  DocumentChanged: documentEvents.DOCUMENT_CHANGED,
  SelectionChanged: 'selection.changed',
  ObjectCreated: documentEvents.ELEMENT_CREATED,
  ObjectDeleted: documentEvents.ELEMENT_REMOVED,
  ObjectUpdated: documentEvents.ELEMENT_UPDATED,
  PageChanged: 'page.changed',
  ZoomChanged: 'zoom.changed',
  ToolChanged: 'tool.changed',
  InteractionStarted: 'interaction.started',
  InteractionFinished: 'interaction.finished',
  LayoutChanged: documentEvents.LAYOUT_CHANGED,
  /** Creator UI notifications (toast / alert). */
  Notify: 'ui.notify',
  /** Creator UI confirm dialogs. */
  Confirm: 'ui.confirm',
  /** Personalization session lifecycle. */
  SessionStarted: 'commerce.session.started',
  SessionSaved: 'commerce.session.saved',
  SessionAutosaved: 'commerce.session.autosaved',
  SessionFinalized: 'commerce.session.finalized',
  SessionCancelled: 'commerce.session.cancelled',
  SessionResumed: 'commerce.session.resumed',
  /** Cart / order handoff events for hosts. */
  CartPayloadReady: 'commerce.cart.ready',
  OrderPayloadReady: 'commerce.order.ready',
  PreviewGenerated: 'commerce.preview.generated',
} as const

export type PlatformEventName = (typeof platformEvents)[keyof typeof platformEvents]

export const eventBus = new EventBus()
