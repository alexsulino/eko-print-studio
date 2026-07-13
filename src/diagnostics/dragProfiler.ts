/**
 * DEV-only drag hot-path profiler.
 * Arms a session around one drag gesture; collects React/Konva/Zustand/command metrics.
 * Not a fix — measurement only.
 */

export type DragProfileComponent =
  | 'CanvasEditor'
  | 'ObjectLayer'
  | 'ElementRenderer'
  | 'ImageNode'
  | 'TextNode'
  | 'ShapeNode'
  | 'SelectionTransformer'
  | 'GuidesLayer'

export type DragProfileEventKind =
  | 'dragStart'
  | 'dragMove'
  | 'dragEnd'
  | 'reactRender'
  | 'konvaDraw'
  | 'konvaBatchDraw'
  | 'zustandUpdate'
  | 'command'
  | 'useEffect'

export interface DragProfileEvent {
  t: number
  kind: DragProfileEventKind
  label?: string
  detail?: Record<string, unknown>
}

export interface DragProfileReport {
  active: boolean
  startedAt: number | null
  endedAt: number | null
  durationMs: number | null
  moveCount: number
  reactRenders: Record<DragProfileComponent, number>
  konvaDraws: number
  konvaBatchDraws: number
  zustandUpdates: number
  zustandUpdateKeys: Record<string, number>
  commands: Array<{ type: string; t: number }>
  moveElementDuringDrag: number
  moveElementOnEnd: number
  useEffectRuns: Record<string, number>
  /** A = Konva node attrs; B = document transform during mid-drag samples */
  visualPositionSource: 'A_Konva_internal' | 'B_Document_synced' | 'unknown'
  midDragSamples: Array<{
    nodeX: number
    nodeY: number
    docX: number
    docY: number
    matchDocument: boolean
  }>
  events: DragProfileEvent[]
}

const emptyRenders = (): Record<DragProfileComponent, number> => ({
  CanvasEditor: 0,
  ObjectLayer: 0,
  ElementRenderer: 0,
  ImageNode: 0,
  TextNode: 0,
  ShapeNode: 0,
  SelectionTransformer: 0,
  GuidesLayer: 0,
})

function createReport(): DragProfileReport {
  return {
    active: false,
    startedAt: null,
    endedAt: null,
    durationMs: null,
    moveCount: 0,
    reactRenders: emptyRenders(),
    konvaDraws: 0,
    konvaBatchDraws: 0,
    zustandUpdates: 0,
    zustandUpdateKeys: {},
    commands: [],
    moveElementDuringDrag: 0,
    moveElementOnEnd: 0,
    useEffectRuns: {},
    visualPositionSource: 'unknown',
    midDragSamples: [],
    events: [],
  }
}

let report = createReport()
let armed = false
let ending = false
let konvaPatched = false
let originalDraw: ((this: unknown, ...args: unknown[]) => unknown) | null = null
let originalBatchDraw: ((this: unknown, ...args: unknown[]) => unknown) | null = null

function now() {
  return performance.now()
}

function push(kind: DragProfileEventKind, label?: string, detail?: Record<string, unknown>) {
  if (!report.active && !ending && kind !== 'dragStart') return
  report.events.push({ t: now(), kind, label, detail })
}

export function isDragProfiling(): boolean {
  return import.meta.env.DEV && (report.active || ending)
}

export function armDragProfiler(): void {
  if (!import.meta.env.DEV) return
  armed = true
  report = createReport()
  patchKonva()
}

export function beginDragProfile(detail?: Record<string, unknown>): void {
  if (!import.meta.env.DEV) return
  if (!armed) {
    armed = true
    report = createReport()
    void patchKonvaFromModule()
  }
  if (report.active) return
  report.active = true
  report.startedAt = now()
  push('dragStart', 'begin', detail)
}

export function recordDragMove(detail?: Record<string, unknown>): void {
  if (!isDragProfiling()) {
    if (armed) beginDragProfile(detail)
    else return
  }
  report.moveCount += 1
  push('dragMove', `move#${report.moveCount}`, detail)
}

export function markDragEnding(): void {
  if (!isDragProfiling()) return
  ending = true
  push('dragEnd', 'ending-before-command')
}

export function endDragProfile(detail?: Record<string, unknown>): DragProfileReport {
  if (!import.meta.env.DEV) return getDragProfileReport()
  if (report.active || ending) {
    if (!report.events.some((e) => e.kind === 'dragEnd' && e.label === 'end')) {
      push('dragEnd', 'end', detail)
    }
    report.endedAt = now()
    report.durationMs =
      report.startedAt != null ? report.endedAt - report.startedAt : null
    report.active = false
    ending = false

    const samples = report.midDragSamples
    if (samples.length > 0) {
      if (samples.some((s) => !s.matchDocument)) {
        report.visualPositionSource = 'A_Konva_internal'
      } else {
        report.visualPositionSource = 'B_Document_synced'
      }
    }
  }
  armed = false
  unpatchKonva()
  return getDragProfileReport()
}

export function recordReactRender(component: DragProfileComponent): void {
  if (!isDragProfiling()) return
  report.reactRenders[component] += 1
  push('reactRender', component)
}

export function recordUseEffect(label: string): void {
  if (!isDragProfiling()) return
  report.useEffectRuns[label] = (report.useEffectRuns[label] ?? 0) + 1
  push('useEffect', label)
}

export function recordZustandUpdate(keys: string[]): void {
  if (!isDragProfiling()) return
  report.zustandUpdates += 1
  for (const key of keys) {
    report.zustandUpdateKeys[key] = (report.zustandUpdateKeys[key] ?? 0) + 1
  }
  push('zustandUpdate', keys.join(','), { keys })
}

export function recordCommand(type: string): void {
  if (!import.meta.env.DEV) return
  if (!report.active && !ending) return
  const t = now()
  report.commands.push({ type, t })
  push('command', type)
  if (type === 'MoveElement' || type === 'MoveElements') {
    if (ending) report.moveElementOnEnd += 1
    else report.moveElementDuringDrag += 1
  }
}

export function recordMidDragPositionSample(sample: {
  nodeX: number
  nodeY: number
  docX: number
  docY: number
}): void {
  if (!isDragProfiling()) return
  const matchDocument =
    Math.abs(sample.nodeX - sample.docX) < 0.01 &&
    Math.abs(sample.nodeY - sample.docY) < 0.01
  report.midDragSamples.push({ ...sample, matchDocument })
}

export function getDragProfileReport(): DragProfileReport {
  return {
    ...report,
    reactRenders: { ...report.reactRenders },
    zustandUpdateKeys: { ...report.zustandUpdateKeys },
    useEffectRuns: { ...report.useEffectRuns },
    commands: [...report.commands],
    midDragSamples: [...report.midDragSamples],
    events: [...report.events],
  }
}

export function resetDragProfiler(): void {
  unpatchKonva()
  armed = false
  ending = false
  report = createReport()
}

type LayerDrawFn = (this: unknown, ...args: unknown[]) => unknown

type LayerProto = {
  draw: LayerDrawFn
  batchDraw: LayerDrawFn
}

function asLayerProto(value: unknown): LayerProto | null {
  if (!value || typeof value !== 'object') return null
  const proto = value as Partial<LayerProto>
  if (typeof proto.draw !== 'function' || typeof proto.batchDraw !== 'function') return null
  return proto as LayerProto
}

function patchKonva(): void {
  if (konvaPatched || !import.meta.env.DEV) return
  try {
    // Lazy require to avoid bundling issues when Konva loads later
    const Konva = (window as unknown as { Konva?: { Layer?: { prototype: unknown } } }).Konva
    const proto = asLayerProto(Konva?.Layer?.prototype)
    if (!proto) {
      // Retry shortly — Stage may load Konva onto window after first import
      setTimeout(() => {
        if (!konvaPatched) void patchKonvaFromModule()
      }, 0)
      return
    }
    patchLayerProto(proto)
  } catch {
    void patchKonvaFromModule()
  }
}

async function patchKonvaFromModule(): Promise<void> {
  if (konvaPatched) return
  try {
    const mod = await import('konva')
    const Layer = (mod as { default?: { Layer?: { prototype: unknown } }; Layer?: { prototype: unknown } })
      .default?.Layer ?? (mod as { Layer?: { prototype: unknown } }).Layer
    const proto = asLayerProto(Layer?.prototype)
    if (proto) patchLayerProto(proto)
  } catch {
    // ignore
  }
}

function patchLayerProto(proto: LayerProto): void {
  if (konvaPatched) return
  originalDraw = proto.draw
  originalBatchDraw = proto.batchDraw
  proto.draw = function patchedDraw(this: unknown, ...args: unknown[]) {
    if (report.active) {
      report.konvaDraws += 1
      push('konvaDraw', 'Layer.draw')
    }
    return originalDraw?.apply(this, args)
  }
  proto.batchDraw = function patchedBatchDraw(this: unknown, ...args: unknown[]) {
    if (report.active) {
      report.konvaBatchDraws += 1
      push('konvaBatchDraw', 'Layer.batchDraw')
    }
    return originalBatchDraw?.apply(this, args)
  }
  konvaPatched = true
}

function unpatchKonva(): void {
  if (!konvaPatched) return
  void import('konva')
    .then((mod) => {
      const Layer = (mod as { default?: { Layer?: { prototype: unknown } }; Layer?: { prototype: unknown } })
        .default?.Layer ?? (mod as { Layer?: { prototype: unknown } }).Layer
      const proto = asLayerProto(Layer?.prototype)
      if (proto) {
        if (originalDraw) proto.draw = originalDraw
        if (originalBatchDraw) proto.batchDraw = originalBatchDraw
      }
      konvaPatched = false
      originalDraw = null
      originalBatchDraw = null
    })
    .catch(() => {
      konvaPatched = false
    })
}

/** Install window bridge for manual / Playwright measurement. */
export function installDragProfilerBridge(): void {
  if (!import.meta.env.DEV) return
  const w = window as unknown as {
    __ekoDragProfiler?: {
      arm: typeof armDragProfiler
      begin: typeof beginDragProfile
      end: typeof endDragProfile
      report: typeof getDragProfileReport
      reset: typeof resetDragProfiler
    }
  }
  w.__ekoDragProfiler = {
    arm: armDragProfiler,
    begin: beginDragProfile,
    end: endDragProfile,
    report: getDragProfileReport,
    reset: resetDragProfiler,
  }
  patchKonvaFromModule()
}
