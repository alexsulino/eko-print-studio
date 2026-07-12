import type { DocumentRegion, RegionKind } from '@/types/layout'
import type { Unit } from '@/types/document'
import { createId } from '@/utils/id'

export interface CreateRegionInput {
  name: string
  kind: RegionKind
  x: number
  y: number
  width: number
  height: number
  unit?: Unit
  visible?: boolean
  purpose?: string
  pageId?: string
  surfaceId?: string
}

export function createRegion(input: CreateRegionInput): DocumentRegion {
  return {
    id: createId('region'),
    name: input.name,
    kind: input.kind,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    unit: input.unit,
    visible: input.visible ?? true,
    purpose: input.purpose,
    pageId: input.pageId,
    surfaceId: input.surfaceId,
  }
}

export interface RegionValidationIssue {
  path: string
  message: string
}

export function validateRegion(region: DocumentRegion, path = 'region'): RegionValidationIssue[] {
  const issues: RegionValidationIssue[] = []
  if (!region.id) issues.push({ path: `${path}.id`, message: 'id is required' })
  if (!region.name) issues.push({ path: `${path}.name`, message: 'name is required' })
  if (!region.kind) issues.push({ path: `${path}.kind`, message: 'kind is required' })
  if (typeof region.width !== 'number' || region.width < 0) {
    issues.push({ path: `${path}.width`, message: 'width must be a non-negative number' })
  }
  if (typeof region.height !== 'number' || region.height < 0) {
    issues.push({ path: `${path}.height`, message: 'height must be a non-negative number' })
  }
  if (typeof region.x !== 'number') {
    issues.push({ path: `${path}.x`, message: 'x must be a number' })
  }
  if (typeof region.y !== 'number') {
    issues.push({ path: `${path}.y`, message: 'y must be a number' })
  }
  return issues
}

export interface DefaultRegionsFromProductionInput {
  widthPx: number
  heightPx: number
  dpi: number
  bleedMm?: number
  safeAreaMm?: number
  marginMm?: number
  surfaceId?: string
  pageId?: string
}

/** Build standard print regions from production metadata (document pixel space). */
export function createDefaultRegionsFromProduction(
  input: DefaultRegionsFromProductionInput,
): DocumentRegion[] {
  const { widthPx, heightPx, dpi, surfaceId, pageId } = input
  const mmToPx = (mm: number) => (mm / 25.4) * dpi
  const regions: DocumentRegion[] = [
    createRegion({
      name: 'Printable Area',
      kind: 'printable',
      x: 0,
      y: 0,
      width: widthPx,
      height: heightPx,
      purpose: 'Full printable canvas',
      surfaceId,
      pageId,
    }),
  ]

  if (input.marginMm != null) {
    const m = mmToPx(input.marginMm)
    regions.push(
      createRegion({
        name: 'Margin Area',
        kind: 'margin',
        x: m,
        y: m,
        width: Math.max(0, widthPx - m * 2),
        height: Math.max(0, heightPx - m * 2),
        purpose: 'Document margin',
        surfaceId,
        pageId,
      }),
    )
  }

  if (input.safeAreaMm != null) {
    const s = mmToPx(input.safeAreaMm)
    regions.push(
      createRegion({
        name: 'Safe Area',
        kind: 'safe',
        x: s,
        y: s,
        width: Math.max(0, widthPx - s * 2),
        height: Math.max(0, heightPx - s * 2),
        purpose: 'Keep critical content inside safe area',
        surfaceId,
        pageId,
      }),
    )
  }

  if (input.bleedMm != null) {
    const b = mmToPx(input.bleedMm)
    regions.push(
      createRegion({
        name: 'Bleed Area',
        kind: 'bleed',
        x: -b,
        y: -b,
        width: widthPx + b * 2,
        height: heightPx + b * 2,
        purpose: 'Bleed beyond trim',
        surfaceId,
        pageId,
        visible: true,
      }),
    )
  }

  return regions
}
