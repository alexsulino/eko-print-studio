import type { EkoDocument } from './document'
import type { EkoElement, ElementTransform } from './element'

export type EditorCommandType =
  | 'LoadDocument'
  | 'SelectElement'
  | 'SelectElements'
  | 'MoveElement'
  | 'MoveElements'
  | 'ResizeElement'
  | 'RotateElement'
  | 'TransformElement'
  | 'TransformElements'
  | 'FlipElement'
  | 'FlipElements'
  | 'UpdateElementProperties'
  | 'UpdateProperty'
  | 'SetVisibility'
  | 'SetLocked'
  | 'DeleteElements'
  | 'AddElements'
  | 'DuplicateElements'
  | 'BringForward'
  | 'SendBackward'
  | 'BringToFront'
  | 'SendToBack'
  | 'MoveToParent'
  | 'MoveToSurface'
  | 'GroupElements'
  | 'UngroupElements'
  | 'AddPage'
  | 'DuplicatePage'
  | 'DeletePage'
  | 'ReorderPages'
  | 'InsertAsset'

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

export interface SelectElementsCommand extends EditorCommandBase {
  type: 'SelectElements'
  elementIds: string[]
}

export interface MoveElementCommand extends EditorCommandBase {
  type: 'MoveElement'
  elementId: string
  x: number
  y: number
}

export interface MoveElementsCommand extends EditorCommandBase {
  type: 'MoveElements'
  moves: Array<{ elementId: string; x: number; y: number }>
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

export interface TransformElementCommand extends EditorCommandBase {
  type: 'TransformElement'
  elementId: string
  transform: Partial<ElementTransform>
}

export interface FlipElementCommand extends EditorCommandBase {
  type: 'FlipElement'
  elementId: string
  axis: 'horizontal' | 'vertical'
}

export interface TransformElementsCommand extends EditorCommandBase {
  type: 'TransformElements'
  transforms: Array<{ elementId: string; transform: Partial<ElementTransform> }>
}

export interface FlipElementsCommand extends EditorCommandBase {
  type: 'FlipElements'
  elementIds: string[]
  axis: 'horizontal' | 'vertical'
}

export interface UpdateElementPropertiesCommand extends EditorCommandBase {
  type: 'UpdateElementProperties'
  elementId: string
  properties: Record<string, unknown>
}

export interface UpdatePropertyCommand extends EditorCommandBase {
  type: 'UpdateProperty'
  elementId: string
  /** Dot path: properties.text | transform.x | … */
  path: string
  oldValue: unknown
  newValue: unknown
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

export interface DeleteElementsCommand extends EditorCommandBase {
  type: 'DeleteElements'
  elementIds: string[]
}

export interface AddElementsCommand extends EditorCommandBase {
  type: 'AddElements'
  elements: EkoElement[]
}

export interface DuplicateElementsCommand extends EditorCommandBase {
  type: 'DuplicateElements'
  elementIds: string[]
  offsetX?: number
  offsetY?: number
}

export interface BringForwardCommand extends EditorCommandBase {
  type: 'BringForward'
  elementId: string
}

export interface SendBackwardCommand extends EditorCommandBase {
  type: 'SendBackward'
  elementId: string
}

export interface BringToFrontCommand extends EditorCommandBase {
  type: 'BringToFront'
  elementId: string
}

export interface SendToBackCommand extends EditorCommandBase {
  type: 'SendToBack'
  elementId: string
}

export interface MoveToParentCommand extends EditorCommandBase {
  type: 'MoveToParent'
  elementId: string
  parentId: string | null
}

export interface MoveToSurfaceCommand extends EditorCommandBase {
  type: 'MoveToSurface'
  elementId: string
  surfaceId: string
}

export interface GroupElementsCommand extends EditorCommandBase {
  type: 'GroupElements'
  elementIds: string[]
  name?: string
}

export interface UngroupElementsCommand extends EditorCommandBase {
  type: 'UngroupElements'
  groupId: string
}

export interface AddPageCommand extends EditorCommandBase {
  type: 'AddPage'
  name?: string
}

export interface DuplicatePageCommand extends EditorCommandBase {
  type: 'DuplicatePage'
  pageId: string
}

export interface DeletePageCommand extends EditorCommandBase {
  type: 'DeletePage'
  pageId: string
}

export interface ReorderPagesCommand extends EditorCommandBase {
  type: 'ReorderPages'
  orderedIds: string[]
}

/**
 * Insert an asset from the library as a new element (centered by default).
 * Payload is self-contained so history does not depend on AssetRepository.
 */
export interface InsertAssetCommand extends EditorCommandBase {
  type: 'InsertAsset'
  assetId: string
  libraryKind: 'image' | 'svg' | 'template'
  sourceUri: string
  name: string
  mimeType?: string
  /** Target surface (active page surface). */
  surfaceId: string
  /** Optional explicit placement; omitted → center of document canvas. */
  x?: number
  y?: number
  width?: number
  height?: number
}

export type EditorCommand =
  | LoadDocumentCommand
  | SelectElementCommand
  | SelectElementsCommand
  | MoveElementCommand
  | MoveElementsCommand
  | ResizeElementCommand
  | RotateElementCommand
  | TransformElementCommand
  | TransformElementsCommand
  | FlipElementCommand
  | FlipElementsCommand
  | UpdateElementPropertiesCommand
  | UpdatePropertyCommand
  | SetVisibilityCommand
  | SetLockedCommand
  | DeleteElementsCommand
  | AddElementsCommand
  | DuplicateElementsCommand
  | BringForwardCommand
  | SendBackwardCommand
  | BringToFrontCommand
  | SendToBackCommand
  | MoveToParentCommand
  | MoveToSurfaceCommand
  | GroupElementsCommand
  | UngroupElementsCommand
  | AddPageCommand
  | DuplicatePageCommand
  | DeletePageCommand
  | ReorderPagesCommand
  | InsertAssetCommand

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
export function commandToRuleAction(command: EditorCommand): import('./element').RuleAction | null {
  switch (command.type) {
    case 'MoveElement':
    case 'MoveElements':
      return 'move'
    case 'ResizeElement':
    case 'TransformElement':
    case 'TransformElements':
      return 'resize'
    case 'RotateElement':
      return 'rotate'
    case 'FlipElement':
    case 'FlipElements':
      return 'resize'
    case 'UpdateElementProperties':
      return 'edit'
    case 'UpdateProperty':
      return 'edit'
    case 'SelectElement':
    case 'SelectElements':
      return 'select'
    case 'DeleteElements':
      return 'delete'
    default:
      return null
  }
}

export type { EkoElement }
