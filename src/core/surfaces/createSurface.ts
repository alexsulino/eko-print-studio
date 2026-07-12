import type { DocumentSurface } from '@/types/layout'
import type { TemplateRules, Unit } from '@/types/document'
import { createId } from '@/utils/id'

export interface CreateSurfaceInput {
  name: string
  slug?: string
  width: number
  height: number
  unit?: Unit
  offsetX?: number
  offsetY?: number
  backgroundColor?: string
  pageId?: string
  elementIds?: string[]
  regionIds?: string[]
  rules?: Partial<TemplateRules>
}

export function createSurface(input: CreateSurfaceInput): DocumentSurface {
  return {
    id: createId('surface'),
    name: input.name,
    slug: input.slug,
    width: input.width,
    height: input.height,
    unit: input.unit,
    offsetX: input.offsetX ?? 0,
    offsetY: input.offsetY ?? 0,
    backgroundColor: input.backgroundColor,
    pageId: input.pageId,
    elementIds: input.elementIds ? [...input.elementIds] : [],
    regionIds: input.regionIds ? [...input.regionIds] : [],
    rules: input.rules ? { ...input.rules } : undefined,
  }
}
