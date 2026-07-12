import { CURRENT_SCHEMA_VERSION, type EkoDocument } from '@/types/document'
import type { EkoElement } from '@/types/element'

export interface ValidationIssue {
  path: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  issues: ValidationIssue[]
}

function isSemanticVersion(value: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(value)
}

function validateElement(element: EkoElement, index: number, issues: ValidationIssue[]): void {
  const base = `elements[${index}]`

  if (!element.id) {
    issues.push({ path: `${base}.id`, message: 'Element id is required' })
  }
  if (!element.type) {
    issues.push({ path: `${base}.type`, message: 'Element type is required' })
  }
  if (!element.category) {
    issues.push({ path: `${base}.category`, message: 'Element category is required' })
  }
  if (!element.transform) {
    issues.push({ path: `${base}.transform`, message: 'Element transform is required' })
    return
  }

  const { width, height } = element.transform
  if (typeof width !== 'number' || width < 0) {
    issues.push({ path: `${base}.transform.width`, message: 'Width must be a non-negative number' })
  }
  if (typeof height !== 'number' || height < 0) {
    issues.push({ path: `${base}.transform.height`, message: 'Height must be a non-negative number' })
  }
}

/**
 * Lightweight structural validation for Phase 1.
 * Does not replace a full JSON Schema in later phases.
 */
export function validateDocument(document: unknown): ValidationResult {
  const issues: ValidationIssue[] = []

  if (!document || typeof document !== 'object') {
    return { valid: false, issues: [{ path: '', message: 'Document must be an object' }] }
  }

  const doc = document as Partial<EkoDocument>

  if (!doc.id) issues.push({ path: 'id', message: 'id is required' })
  if (!doc.type || !['template', 'session', 'production'].includes(doc.type)) {
    issues.push({ path: 'type', message: 'type must be template | session | production' })
  }
  if (!doc.schemaVersion || !isSemanticVersion(doc.schemaVersion)) {
    issues.push({
      path: 'schemaVersion',
      message: `schemaVersion must be semantic (expected like ${CURRENT_SCHEMA_VERSION})`,
    })
  }
  if (!doc.metadata?.name) {
    issues.push({ path: 'metadata.name', message: 'metadata.name is required' })
  }
  if (!doc.canvas) {
    issues.push({ path: 'canvas', message: 'canvas is required' })
  } else {
    if (typeof doc.canvas.width !== 'number' || doc.canvas.width <= 0) {
      issues.push({ path: 'canvas.width', message: 'canvas.width must be > 0' })
    }
    if (typeof doc.canvas.height !== 'number' || doc.canvas.height <= 0) {
      issues.push({ path: 'canvas.height', message: 'canvas.height must be > 0' })
    }
    if (!doc.canvas.unit || !['mm', 'cm', 'px'].includes(doc.canvas.unit)) {
      issues.push({ path: 'canvas.unit', message: 'canvas.unit must be mm | cm | px' })
    }
    if (typeof doc.canvas.dpi !== 'number' || doc.canvas.dpi <= 0) {
      issues.push({ path: 'canvas.dpi', message: 'canvas.dpi must be > 0' })
    }
  }

  if (!doc.permissions) {
    issues.push({ path: 'permissions', message: 'permissions is required' })
  }
  if (!doc.variables) {
    issues.push({ path: 'variables', message: 'variables is required' })
  }
  if (!Array.isArray(doc.elements)) {
    issues.push({ path: 'elements', message: 'elements must be an array' })
  } else {
    doc.elements.forEach((el, i) => validateElement(el, i, issues))
  }

  if (doc.type === 'session' && !doc.metadata?.masterId) {
    issues.push({ path: 'metadata.masterId', message: 'session documents require metadata.masterId' })
  }

  return { valid: issues.length === 0, issues }
}
