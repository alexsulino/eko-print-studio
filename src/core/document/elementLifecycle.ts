import type { ElementLifecycleRecord, ElementLifecycleState } from '@/types/layout'

/**
 * Element Lifecycle — prepared state machine structure.
 * Visual wiring of all states is deferred; this tracks intent for future phases.
 */
export class ElementLifecycle {
  private records = new Map<string, ElementLifecycleRecord>()

  get(elementId: string): ElementLifecycleRecord | null {
    return this.records.get(elementId) ?? null
  }

  set(elementId: string, state: ElementLifecycleState): ElementLifecycleRecord {
    const record: ElementLifecycleRecord = {
      elementId,
      state,
      updatedAt: Date.now(),
    }
    this.records.set(elementId, record)
    return { ...record }
  }

  markLoaded(elementIds: string[]): void {
    for (const id of elementIds) {
      this.set(id, 'loaded')
    }
  }

  clear(): void {
    this.records.clear()
  }

  /** Valid transitions (informational — not strictly enforced yet). */
  static canTransition(from: ElementLifecycleState, to: ElementLifecycleState): boolean {
    if (from === to) return true
    if (from === 'removed' || from === 'exported') return false
    if (to === 'created') return false
    return true
  }
}

export const elementLifecycle = new ElementLifecycle()
