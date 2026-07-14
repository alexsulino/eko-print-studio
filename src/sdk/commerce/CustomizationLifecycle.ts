import type { PersonalizationSessionRecord } from '@/types/commerce'
import type { CustomizationLifecycleStatus, CustomizationRecord } from '@/types/customization'
import {
  assertCustomizationTransition,
  ensureCustomizationFields,
  migrateSessionToCustomization,
} from '@/types/customization'
import { createId } from '@/utils/id'

/**
 * Applies a business lifecycle transition on a session/customization record.
 * Keeps `status` (editor) and `lifecycle` (business) aligned where possible.
 */
export function applyLifecycle(
  record: PersonalizationSessionRecord,
  next: CustomizationLifecycleStatus,
  at = new Date().toISOString(),
): PersonalizationSessionRecord {
  const current = ensureCustomizationFields(record)
  const from = current.lifecycle ?? 'created'
  assertCustomizationTransition(from, next)

  const patch: PersonalizationSessionRecord = {
    ...current,
    lifecycle: next,
    updatedAt: at,
  }

  switch (next) {
    case 'editing':
      return { ...patch, status: 'active' }
    case 'saved':
      return { ...patch, status: 'saved', savedAt: at }
    case 'finalized':
      return { ...patch, status: 'finalized', finalizedAt: at }
    case 'cart_attached':
      return { ...patch, cartAttachedAt: at }
    case 'ordered':
      return { ...patch, orderedAt: at }
    case 'cancelled':
      return { ...patch, status: 'cancelled', cancelledAt: at }
    case 'created':
    default:
      return patch
  }
}

/** Seed revision tip without retaining full history (future: append-only log). */
export function touchCurrentRevision(
  record: PersonalizationSessionRecord,
  label = 'current',
): PersonalizationSessionRecord {
  const ensured = ensureCustomizationFields(record)
  const revId = ensured.currentRevisionId || createId('crev')
  const tip = {
    id: revId,
    createdAt: new Date().toISOString(),
    label,
    documentId: ensured.documentId,
    preview: ensured.preview,
  }
  // Keep at most the tip in v1 — structure ready for multi-revision later.
  return {
    ...ensured,
    currentRevisionId: revId,
    revisions: [tip],
  }
}

export function toCustomizationView(record: PersonalizationSessionRecord): CustomizationRecord {
  return migrateSessionToCustomization(ensureCustomizationFields(record))
}

export function resolveCustomizationId(
  sessionIdOrCustomizationId: string,
  record?: PersonalizationSessionRecord | null,
): string {
  if (record?.customizationId) return record.customizationId
  return sessionIdOrCustomizationId
}
