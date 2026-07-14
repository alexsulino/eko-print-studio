/**
 * Document & Workspace Engine facade — composition root for v0.3.0+ platform infra.
 * Interaction / Viewport / History remain separate and must not be folded in here.
 */
import { DocumentEngine } from '@/core/document/DocumentEngine'
import { PageEngine } from '@/core/pages/PageEngine'
import { LayoutEngine } from '@/core/layout/LayoutEngine'
import { WorkspaceEngine, workspaceEngine } from '@/core/workspace/WorkspaceEngine'
import { UnitsEngine } from '@/core/units'
import { CoordinateSystem } from '@/core/coordinates/CoordinateSystem'
import { GuidesEngine, guidesEngine } from '@/core/guides/GuidesEngine'
import { GridEngine, gridEngine } from '@/core/grid/GridEngine'
import { RulerEngine } from '@/core/rulers/RulerEngine'
import { LayoutResolver, RendererAdapter } from '@/core/layout'

export const DocumentWorkspacePlatform = {
  document: DocumentEngine,
  page: PageEngine,
  layout: LayoutEngine,
  workspace: WorkspaceEngine,
  units: UnitsEngine,
  coordinates: CoordinateSystem,
  guides: guidesEngine,
  GuidesEngine,
  grid: GridEngine,
  rulers: RulerEngine,
  /** Existing resolve/render pipeline kept for Canvas bridges. */
  resolve: LayoutResolver,
  frame: RendererAdapter,
  workspaceEngine,
  gridEngine,
}

export {
  DocumentEngine,
  PageEngine,
  LayoutEngine,
  WorkspaceEngine,
  UnitsEngine,
  CoordinateSystem,
  GuidesEngine,
  guidesEngine,
  GridEngine,
  gridEngine,
  RulerEngine,
}
