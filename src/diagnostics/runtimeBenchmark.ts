/**
 * Dev-only runtime stability & performance baseline metrics.
 * Extends editor diagnostics without persisting or shipping to production.
 */

export interface RuntimeBenchmarkSnapshot {
  canvasEditorRenderCount: number
  nodeMapVersion: number
  nodeMapVersionBumps: number
  registryCallbackCount: number
  registryHandlerCalls: number
  lastPropertyUpdateMs: number | null
  benchmarkMode: boolean
}

const benchmark: RuntimeBenchmarkSnapshot = {
  canvasEditorRenderCount: 0,
  nodeMapVersion: 0,
  nodeMapVersionBumps: 0,
  registryCallbackCount: 0,
  registryHandlerCalls: 0,
  lastPropertyUpdateMs: null,
  benchmarkMode: false,
}

function devOnly(): boolean {
  return import.meta.env.DEV
}

export function setBenchmarkMode(enabled: boolean): void {
  if (!devOnly()) return
  benchmark.benchmarkMode = enabled
}

export function isBenchmarkMode(): boolean {
  return devOnly() && benchmark.benchmarkMode
}

export function recordCanvasEditorRender(): void {
  if (!devOnly()) return
  benchmark.canvasEditorRenderCount += 1
  if (isBenchmarkMode() && benchmark.canvasEditorRenderCount % 25 === 0) {
    // eslint-disable-next-line no-console
    console.debug('[Eko Benchmark] CanvasEditor renders', benchmark.canvasEditorRenderCount)
  }
}

export function recordNodeMapVersion(version: number, bumped: boolean): void {
  if (!devOnly()) return
  benchmark.nodeMapVersion = version
  if (bumped) {
    benchmark.nodeMapVersionBumps += 1
    if (isBenchmarkMode()) {
      // eslint-disable-next-line no-console
      console.debug('[Eko Benchmark] nodeMapVersion bump →', version)
    }
  }
}

export function recordRegistryStats(stats: {
  callbackCount: number
  handlerCalls: number
}): void {
  if (!devOnly()) return
  benchmark.registryCallbackCount = stats.callbackCount
  benchmark.registryHandlerCalls = stats.handlerCalls
}

export function recordPropertyUpdateMs(ms: number): void {
  if (!devOnly()) return
  benchmark.lastPropertyUpdateMs = Math.round(ms)
  if (isBenchmarkMode()) {
    // eslint-disable-next-line no-console
    console.debug('[Eko Benchmark] property update', benchmark.lastPropertyUpdateMs, 'ms')
  }
}

export function getRuntimeBenchmarkSnapshot(): RuntimeBenchmarkSnapshot {
  return { ...benchmark }
}

export function resetRuntimeBenchmarkForTests(): void {
  benchmark.canvasEditorRenderCount = 0
  benchmark.nodeMapVersion = 0
  benchmark.nodeMapVersionBumps = 0
  benchmark.registryCallbackCount = 0
  benchmark.registryHandlerCalls = 0
  benchmark.lastPropertyUpdateMs = null
  benchmark.benchmarkMode = false
}
