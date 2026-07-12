import { SelectionEngine } from '@/core/selection/SelectionEngine'
import { ClipboardEngine, clipboardEngine } from '@/core/clipboard/ClipboardEngine'
import { SnappingEngine } from '@/core/snapping/SnappingEngine'
import { TransformerEngine } from '@/core/transformer/TransformerEngine'
import { KeyboardEngine } from '@/core/keyboard/KeyboardEngine'
import { viewportManager } from '@/core/viewport/ViewportManager'

/**
 * Interaction Engine facade — composition root for interaction modules.
 * UI → Interaction Engine → Commands → Rules → Store → History → Renderer
 */
export const InteractionEngine = {
  selection: SelectionEngine,
  clipboard: clipboardEngine,
  ClipboardEngine,
  snapping: SnappingEngine,
  transformer: TransformerEngine,
  keyboard: KeyboardEngine,
  viewport: viewportManager,
}

export {
  SelectionEngine,
  ClipboardEngine,
  clipboardEngine,
  SnappingEngine,
  TransformerEngine,
  KeyboardEngine,
}
