import type { DocumentPage } from '@/types/layout'
import { createId } from '@/utils/id'

export interface CreatePageInput {
  name: string
  index?: number
  width?: number
  height?: number
  surfaceIds?: string[]
  regionIds?: string[]
}

export function createPage(input: CreatePageInput): DocumentPage {
  return {
    id: createId('page'),
    name: input.name,
    index: input.index ?? 0,
    width: input.width,
    height: input.height,
    surfaceIds: input.surfaceIds ? [...input.surfaceIds] : [],
    regionIds: input.regionIds ? [...input.regionIds] : [],
    elements: [],
  }
}
