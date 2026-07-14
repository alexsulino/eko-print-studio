export { EkoPrintStudio, platformEvents } from './EkoPrintStudio'
export type { EkoPrintStudioOptions, EditorRegisterTarget } from './EkoPrintStudio'
export { EditorProvider, useEditor, useEditorSnapshot, useEditorSession, useThemeMode } from './react/EditorProvider'
export { editorSession } from './session/EditorSession'
export type { EditorSnapshot, NotifyPayload, ConfirmPayload, EditorSessionApi } from './session/EditorSession'
export {
  PersonalizationSessionManager,
  InMemorySessionStore,
} from './commerce/PersonalizationSessionManager'
export type {
  PersonalizationSessionManagerOptions,
  PersonalizationSessionStore,
} from './commerce/PersonalizationSessionManager'
export {
  applyLifecycle,
  toCustomizationView,
  touchCurrentRevision,
  resolveCustomizationId,
} from './commerce/CustomizationLifecycle'
export { buildProductionPreview, buildRasterPreview } from './preview/ProductionPreview'
export { bindPostMessageTransport, postToEditor } from './host/PostMessageBridge'
export type { PostMessageBridgeOptions } from './host/PostMessageBridge'
export {
  bootCommerceFromUrl,
  createCommerceProvider,
  commerceMessages,
  isCommerceProvider,
} from '@/providers/commerce'
export type {
  CommerceProvider,
  CommerceBootContext,
  CommerceStartOptions,
  CommercePlatformId,
  CommerceHostBootOptions,
  CommerceHostBootResult,
} from '@/providers/commerce'

export type {
  CommerceCartPayload,
  CommerceEmbedMode,
  CommerceOpenEditorOptions,
  CommerceOrderPayload,
  CommerceProductContext,
  PersonalizationSessionRecord,
  PersonalizationSessionStatus,
  ProductionPreviewRef,
  CommerceSessionSnapshot,
  CustomizationLifecycleStatus,
  CustomizationRecord,
  CustomizationRevision,
} from '@/types/commerce'
export {
  CUSTOMIZATION_SCHEMA,
  CUSTOMIZATION_TRANSITIONS,
  canTransitionCustomization,
  ensureCustomizationFields,
  migrateSessionToCustomization,
} from '@/types/customization'
