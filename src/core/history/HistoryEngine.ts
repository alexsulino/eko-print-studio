import type { EkoDocument } from '@/types/document'
import type { EditorCommand, HistoryEngine } from '@/types/history'

interface HistoryEntry {
  command: EditorCommand
  before: EkoDocument
  after: EkoDocument
}

/**
 * Command Pattern history foundation.
 * Phase 1: structure + stack API. Full undo/redo wiring lands in a later phase.
 */
export class CommandHistoryEngine implements HistoryEngine {
  private undoStack: HistoryEntry[] = []
  private redoStack: HistoryEntry[] = []
  private readonly limit: number

  constructor(limit = 100) {
    this.limit = limit
  }

  push(command: EditorCommand, before: EkoDocument, after: EkoDocument): void {
    this.undoStack.push({ command, before, after })
    if (this.undoStack.length > this.limit) {
      this.undoStack.shift()
    }
    this.redoStack = []
  }

  undo(): EditorCommand | null {
    const entry = this.undoStack.pop()
    if (!entry) return null
    this.redoStack.push(entry)
    return entry.command
  }

  redo(): EditorCommand | null {
    const entry = this.redoStack.pop()
    if (!entry) return null
    this.undoStack.push(entry)
    return entry.command
  }

  /** Returns document snapshot before the last command (for future store integration). */
  peekUndoBefore(): EkoDocument | null {
    const entry = this.undoStack[this.undoStack.length - 1]
    return entry?.before ?? null
  }

  peekRedoAfter(): EkoDocument | null {
    const entry = this.redoStack[this.redoStack.length - 1]
    return entry?.after ?? null
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  clear(): void {
    this.undoStack = []
    this.redoStack = []
  }
}

export const historyEngine = new CommandHistoryEngine()
