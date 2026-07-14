export type { DirtyRegion, DrawablePrimitive, FrameBudget, OverlayItem, OverlayKind, RenderItem, RenderLayer, RenderLayerId, RenderScene } from './types'
export { createRenderContext, DEFAULT_RENDER_THEME } from './RenderContext'
export type { RenderContext, RenderTheme } from './RenderContext'
export { RendererRegistry, rendererRegistry } from './RendererRegistry'
export type { ObjectRenderer } from './RendererRegistry'
export { RenderCache, renderCache } from './RenderCache'
export type { RenderCacheKind } from './RenderCache'
export { RenderLayers } from './RenderLayers'
export { OverlaySystem, overlaySystem } from './OverlaySystem'
export type { OverlayContributor } from './OverlaySystem'
export { RenderPipeline, renderPipeline } from './RenderPipeline'
export type { RenderPipelineOptions } from './RenderPipeline'
export type { RenderPass, PassState } from './passes/RenderPass'
export {
  VisibilityPass,
  LockPass,
  TransformPass,
  ClipPass,
  OpacityPass,
  EffectsPass,
  ContentRenderPass,
  OverlayPass,
} from './passes/builtinPasses'
export {
  createBuiltinObjectRenderers,
  textRenderer,
  imageRenderer,
  shapeRenderer,
  groupRenderer,
  frameRenderer,
  tableRenderer,
  stubRenderer,
  noneRenderer,
  svgRenderer,
  qrCodeRenderer,
  barcodeRenderer,
  maskRenderer,
  mockupRenderer,
} from './renderers/builtinObjectRenderers'
export type { RendererBackend, CanvasAdapter, GraphicsAdapter } from './adapters/GraphicsAdapter'
