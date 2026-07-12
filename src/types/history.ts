import type { EkoDocument } from './document'
import type { EkoElement, RuleAction } from './element'

export type EditorCommandType =
  | 'LoadDocument'
  | 'SelectElement'
  | 'MoveElement'
  | 'ResizeElement'
  | 'RotateElement'
  | 'UpdateElementProperties'
  | 'SetVisibility'
  | 'SetLocked'

export interface EditorCommandBase {
  type: EditorCommandType
  timestamp: number
  /** Optional correlation for undo pairing. */
  id?: string
}

export interface LoadDocumentCommand extends EditorCommandBase {
  type: 'LoadDocument'
  document: EkoDocument
}

export interface SelectElementCommand extends EditorCommandBase {
  type: 'SelectElement'
  elementId: string | null
}

export interface MoveElementCommand extends EditorCommandBase {
  type: 'MoveElement'
  elementId: string
  x: number
  y: number
}

export interface ResizeElementCommand extends EditorCommandBase {
  type: 'ResizeElement'
  elementId: string
  width: number
  height: number
  x?: number
  y?: number
  scaleX?: number
  scaleY?: number
}

export interface RotateElementCommand extends EditorCommandBase {
  type: 'RotateElement'
  elementId: string
  rotation: number
}

export interface UpdateElementPropertiesCommand extends EditorCommandBase {
  type: 'UpdateElementProperties'
  elementId: string
  properties: Record<string, unknown>
}

export interface SetVisibilityCommand extends EditorCommandBase {
  type: 'SetVisibility'
  elementId: string
  visible: boolean
}

export interface SetLockedCommand extends EditorCommandBase {
  type: 'SetLocked'
  elementId: string
  locked: boolean
}

export type EditorCommand =
  | LoadDocumentCommand
  | SelectElementCommand
  | MoveElementCommand
  | ResizeElementCommand
  | RotateElementCommand
  | UpdateElementPropertiesCommand
  | SetVisibilityCommand
  | SetLockedCommand

export interface CommandResult {
  success: boolean
  reason?: string
  document?: EkoDocument
}

export interface HistoryEngine {
  push(command: EditorCommand, before: EkoDocument, after: EkoDocument): void
  undo(): EditorCommand | null
  redo(): EditorCommand | null
  canUndo(): boolean
  canRedo(): boolean
  clear(): void
}

/** Maps rule actions to transform-related commands for validation. */
export function commandToRuleAction(command: EditorCommand): RuleAction | null {
  switch (command.type) {
    case 'MoveElement':
      return 'move'
    case 'ResizeElement':
      return 'resize'
    case 'RotateElement':
      return 'rotate'
    case 'UpdateElementProperties':
      return 'edit'
    case 'SelectElement':
      return 'select'
    default:
      return null
  }
}

export type { EkoElement }
