import type {
  CommerceEmbedMode,
  CommerceProductContext,
  PersonalizationSessionRecord,
  PersonalizationSessionStatus,
  ProductionPreviewRef,
} from './commerce'

/**
 * Business entity: Customization — complete personalization of a product line.
 * Schema `eko.customization/1`. Session-only records migrate transparently
 * (`customizationId` / `sessionId` share the same id).
 */
export const CUSTOMIZATION_SCHEMA = 'eko.customization/1' as const

/**
 * Business lifecycle (host-visible). Editor fine-grained status stays on
 * `PersonalizationSessionRecord.status` (`active` / `autosaving` / …).
 */
export type CustomizationLifecycleStatus =
  | 'created'
  | 'editing'
  | 'saved'
  | 'finalized'
  | 'cart_attached'
  | 'ordered'
  | 'cancelled'

/** Future multi-revision support — contracts already accept an array. */
export interface CustomizationRevision {
  id: string
  createdAt: string
  label?: string
  documentId?: string
  preview?: ProductionPreviewRef
  meta?: Record<string, unknown>
}

/**
 * Canonical customization record. Persistence may store this shape nested on
 * the session record (`PersonalizationSessionRecord` + lifecycle fields).
 */
export interface CustomizationRecord {
  schema: typeof CUSTOMIZATION_SCHEMA
  /** Stable business id (equals sessionId for migrated / v1 records). */
  id: string
  /** Compatibility alias — same as `id` today; hosts may send either. */
  sessionId: string
  lifecycle: CustomizationLifecycleStatus
  product: CommerceProductContext
  masterId: string
  documentId: string
  preview?: ProductionPreviewRef
  currentRevisionId?: string
  /** Prepared for history / collaboration — usually empty or a single tip. */
  revisions: CustomizationRevision[]
  createdAt: string
  updatedAt: string
  savedAt?: string
  finalizedAt?: string
  cartAttachedAt?: string
  orderedAt?: string
  cancelledAt?: string
  schemaVersion?: string
  embedMode?: CommerceEmbedMode
}

/** Valid business transitions — reject inconsistent jumps. */
export const CUSTOMIZATION_TRANSITIONS: Record<
  CustomizationLifecycleStatus,
  readonly CustomizationLifecycleStatus[]
> = {
  created: ['editing', 'cancelled'],
  editing: ['saved', 'finalized', 'cancelled'],
  saved: ['editing', 'finalized', 'cancelled'],
  finalized: ['editing', 'cart_attached', 'cancelled'],
  cart_attached: ['editing', 'ordered', 'cancelled'],
  ordered: ['editing'], // admin re-edit (optional reopen)
  cancelled: [],
}

export function canTransitionCustomization(
  from: CustomizationLifecycleStatus,
  to: CustomizationLifecycleStatus,
): boolean {
  if (from === to) return true
  return CUSTOMIZATION_TRANSITIONS[from].includes(to)
}

export function assertCustomizationTransition(
  from: CustomizationLifecycleStatus,
  to: CustomizationLifecycleStatus,
): void {
  if (!canTransitionCustomization(from, to)) {
    throw new Error(`Customization: invalid transition ${from} → ${to}`)
  }
}

/** Map legacy session-only status → business lifecycle. */
export function lifecycleFromSessionStatus(
  status: PersonalizationSessionStatus,
  hints?: { cartAttached?: boolean; ordered?: boolean },
): CustomizationLifecycleStatus {
  if (hints?.ordered) return 'ordered'
  if (hints?.cartAttached) return 'cart_attached'
  switch (status) {
    case 'cancelled':
      return 'cancelled'
    case 'finalized':
      return 'finalized'
    case 'saved':
      return 'saved'
    case 'idle':
    case 'starting':
      return 'created'
    case 'active':
    case 'autosaving':
    default:
      return 'editing'
  }
}

/** Transparent migration: session id becomes customization id. */
export function migrateSessionToCustomization(
  record: PersonalizationSessionRecord,
  hints?: { cartAttached?: boolean; ordered?: boolean },
): CustomizationRecord {
  const id = record.customizationId || record.id
  const lifecycle =
    record.lifecycle ?? lifecycleFromSessionStatus(record.status, hints)
  return {
    schema: CUSTOMIZATION_SCHEMA,
    id,
    sessionId: record.id,
    lifecycle,
    product: record.product,
    masterId: record.masterId,
    documentId: record.documentId,
    preview: record.preview,
    currentRevisionId: record.currentRevisionId,
    revisions: record.revisions ?? [],
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    savedAt: record.savedAt,
    finalizedAt: record.finalizedAt,
    cartAttachedAt: record.cartAttachedAt,
    orderedAt: record.orderedAt,
    cancelledAt: record.cancelledAt,
    schemaVersion: record.schemaVersion,
    embedMode: record.embedMode,
  }
}

/** Ensure session record carries customization identity fields (in-place migrate). */
export function ensureCustomizationFields(
  record: PersonalizationSessionRecord,
): PersonalizationSessionRecord {
  const id = record.customizationId || record.id
  return {
    ...record,
    customizationId: id,
    lifecycle: record.lifecycle ?? lifecycleFromSessionStatus(record.status),
    revisions: record.revisions ?? [],
  }
}
