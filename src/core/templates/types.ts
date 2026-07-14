import type { EkoDocument } from '@/types/document'

/** Lifecycle of a Template Master in the public catalog. */
export type TemplateMasterStatus = 'published' | 'draft' | 'archived'

/**
 * Public catalog entry for a Template Master.
 * Hosts (WooCommerce, etc.) consume this shape — never internal document IDs as free text.
 */
export interface TemplateMasterInfo {
  id: string
  name: string
  category?: string
  thumbnail?: string
  status: TemplateMasterStatus
}

/** Full registry record — catalog metadata + document payload. */
export interface TemplateMasterRecord extends TemplateMasterInfo {
  document: EkoDocument
}
