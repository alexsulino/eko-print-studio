export type { TemplateMasterInfo, TemplateMasterRecord, TemplateMasterStatus } from './types'
export { templateRegistry } from './TemplateRegistry'
export {
  ensureBuiltinTemplatesRegistered,
  getPublishedTemplateCatalog,
  CANECA_BRASIL_MASTER_ID,
} from './registerBuiltins'
export { createSimpleMaster } from './createSimpleMaster'
export type { SimpleMasterSpec } from './createSimpleMaster'

/** Stable alias used by editor bootstrap / commerce demos. */
export { CANECA_BRASIL_MASTER_ID as SAMPLE_MASTER_ID } from './registerBuiltins'
