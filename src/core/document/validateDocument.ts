import {
  CURRENT_SCHEMA_VERSION,
  MIN_SUPPORTED_SCHEMA_VERSION,
  type EkoDocument,
} from '@/types/document'
import type { EkoElement } from '@/types/element'
import { validateRegion } from '@/core/regions/createRegion'
import { isSupportedSchemaVersion } from '@/core/document/normalizeDocument'

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

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
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
 * Structural validation for Document & Layout Engine (schema 1.0.0 – 1.1.0).
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
  } else if (
    !isSupportedSchemaVersion(doc.schemaVersion) ||
    compareSemver(doc.schemaVersion, MIN_SUPPORTED_SCHEMA_VERSION) < 0
  ) {
    issues.push({
      path: 'schemaVersion',
      message: `schemaVersion must be >= ${MIN_SUPPORTED_SCHEMA_VERSION}`,
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

  if (doc.regions) {
    if (!Array.isArray(doc.regions)) {
      issues.push({ path: 'regions', message: 'regions must be an array' })
    } else {
      doc.regions.forEach((region, i) => {
        issues.push(...validateRegion(region, `regions[${i}]`))
      })
    }
  }

  if (doc.surfaces) {
    if (!Array.isArray(doc.surfaces)) {
      issues.push({ path: 'surfaces', message: 'surfaces must be an array' })
    } else {
      doc.surfaces.forEach((surface, i) => {
        const base = `surfaces[${i}]`
        if (!surface.id) issues.push({ path: `${base}.id`, message: 'id is required' })
        if (!surface.name) issues.push({ path: `${base}.name`, message: 'name is required' })
        if (typeof surface.width !== 'number' || surface.width <= 0) {
          issues.push({ path: `${base}.width`, message: 'width must be > 0' })
        }
        if (typeof surface.height !== 'number' || surface.height <= 0) {
          issues.push({ path: `${base}.height`, message: 'height must be > 0' })
        }
        if (!Array.isArray(surface.elementIds)) {
          issues.push({ path: `${base}.elementIds`, message: 'elementIds must be an array' })
        }
      })
    }
  }

  if (doc.pages) {
    if (!Array.isArray(doc.pages)) {
      issues.push({ path: 'pages', message: 'pages must be an array' })
    } else {
      doc.pages.forEach((page, i) => {
        if (!page.id) issues.push({ path: `pages[${i}].id`, message: 'id is required' })
        if (!page.name) issues.push({ path: `pages[${i}].name`, message: 'name is required' })
      })
    }
  }

  if (doc.type === 'production' && doc.guides && doc.guides.length > 0) {
    issues.push({
      path: 'guides',
      message: 'production documents must not include editor guides',
    })
  }

  return { valid: issues.length === 0, issues }
}
