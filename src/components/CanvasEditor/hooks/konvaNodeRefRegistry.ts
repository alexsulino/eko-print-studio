import type Konva from 'konva'

export type KonvaNodeRefHandler = (id: string, node: Konva.Node | null) => void

/**
 * Stable Konva ref callbacks keyed by element id.
 * One callback instance per id for the lifetime of the registry (until prune/clear).
 */
export class KonvaNodeRefRegistry {
  private callbacks = new Map<string, (node: Konva.Node | null) => void>()
  private handlerCalls = 0

  constructor(private handler: KonvaNodeRefHandler) {}

  setHandler(handler: KonvaNodeRefHandler): void {
    this.handler = handler
  }

  getRef(id: string): (node: Konva.Node | null) => void {
    let callback = this.callbacks.get(id)
    if (!callback) {
      callback = (node) => {
        this.handlerCalls += 1
        this.handler(id, node)
      }
      this.callbacks.set(id, callback)
    }
    return callback
  }

  getStats(): {
    callbackCount: number
    handlerCalls: number
  } {
    return {
      callbackCount: this.callbacks.size,
      handlerCalls: this.handlerCalls,
    }
  }

  resetStats(): void {
    this.handlerCalls = 0
  }

  prune(liveIds: ReadonlySet<string>): void {
    for (const id of this.callbacks.keys()) {
      if (!liveIds.has(id)) this.callbacks.delete(id)
    }
  }

  clear(): void {
    this.callbacks.clear()
    this.handlerCalls = 0
  }

  /** Test helper — whether a stable callback exists for id. */
  hasCallback(id: string): boolean {
    return this.callbacks.has(id)
  }
}

/**
 * Updates the Konva node map for SelectionTransformer.
 * Returns true when the map changed (caller may bump nodeMapVersion).
 */
export function applyNodeRefToMap(
  map: Map<string, Konva.Node>,
  id: string,
  node: Konva.Node | null,
): boolean {
  if (!node) {
    if (!map.has(id)) return false
    map.delete(id)
    return true
  }
  if (map.get(id) === node) return false
  map.set(id, node)
  return true
}
