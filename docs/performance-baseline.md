# Performance Baseline — Eko Print Studio v0.5.1

Runtime stability snapshot taken before Asset Engine. All metrics are **dev-only** (`import.meta.env.DEV`); production bundles strip instrumentation.

## How to measure

1. Run `npm run dev`
2. Open the editor → **Ctrl+Shift+D** (Diagnostics panel)
3. Enable **Benchmark mode** for verbose console logs
4. Load fixtures: **small (10)**, **medium (100)**, **large (500)**

## Fixtures

| Fixture | Elements | Mix |
|---------|----------|-----|
| `small` | 10 | Text / Shape / Image (cyclic) |
| `medium` | 100 | Same distribution |
| `large` | 500 | Same distribution |

Built by `createBenchmarkDocument()` in `src/diagnostics/benchmarkDocuments.ts`. Images use mock asset `/sample/demo-image.svg`.

## Metrics (current baseline)

| Metric | Source | Typical (small / medium / large) |
|--------|--------|----------------------------------|
| Initial canvas mount | `editorDiagnostics.initialRenderMs` | ~50–150 ms / ~80–250 ms / ~200–600 ms* |
| Render nodes | Diagnostics → Renderer | 10 / 100 / 500 |
| CanvasEditor renders | `runtimeBenchmark.canvasEditorRenderCount` | Stable after mount (< 30) |
| nodeMapVersion bumps | `runtimeBenchmark.nodeMapVersionBumps` | ≈ element count on first mount |
| Registry callbacks | `runtimeBenchmark.registryCallbackCount` | ≈ render node count |
| Registry handler calls | `runtimeBenchmark.registryHandlerCalls` | ≈ mounts (no per-render churn) |
| Property update | `runtimeBenchmark.lastPropertyUpdateMs` | < 5 ms (command path only) |
| Layout resolve (500 el) | Vitest `benchmarkDocuments.test.ts` | < 500 ms |

\* Browser-dependent; measure locally with Diagnostics panel.

## Validation results (automated)

| Scenario | Status | Mechanism |
|----------|--------|-----------|
| Add element → ref created once | ✅ | `KonvaNodeRefRegistry.getRef` idempotent |
| Property change → ref not recreated | ✅ | Stable callback Map + memo comparator |
| Selection → unselected nodes skip rerender | ✅ | Removed `selected` from node props; `React.memo` + `areCanvasNodePropsEqual` |
| Document swap → full cleanup | ✅ | `registry.clear()` + `nodeMapRef.clear()` on `document.id` change |
| 500 elements layout | ✅ | `LayoutResolver` < 500 ms in CI |

## Gargalos identificados

1. **ObjectLayer re-render on selection** — CanvasEditor still re-renders on `selectedIds` (SelectionTransformer). Node components no longer rerender; acceptable.
2. **ShapeNode `common` object** — Recreated per ElementRenderer render; mitigated by ElementRenderer memo when props stable.
3. **ImageNode `useHtmlImage`** — Each image loads async; 500 images = 500 decode tasks. **Asset Engine** should introduce shared texture/cache.
4. **Layout resolve O(n)** — Linear per document change; fine at 500, monitor at 1000+.
5. **No virtualized canvas** — All nodes mount in Konva Stage; expected until viewport culling is needed.

## Decisões tomadas

| Decision | Rationale |
|----------|-----------|
| Extend existing diagnostics (no new subsystem) | User constraint; Ctrl+Shift+D remains single dev entry point |
| `KonvaNodeRefRegistry` per-id stable callbacks | Eliminates ref(null) churn; scales with Asset Engine nodes |
| `React.memo` on Text/Image/Shape + ElementRenderer | Structural sharing from commands preserves unchanged element refs |
| Remove `selected` from node props | Selection visual handled solely by `SelectionTransformer` |
| Memoize ObjectLayer callbacks in CanvasEditor | Prevents memo bust from inline arrow functions |
| `applyNodeRefToMap` idempotency | nodeMapVersion bumps only on real map changes |
| Benchmark fixtures via `LoadDocument` command | Reuses existing command path; no store architecture change |
| Property update timing in `dispatch` (DEV only) | Minimal hook; measures command latency not Konva paint |

## Files

| Path | Role |
|------|------|
| `src/diagnostics/runtimeBenchmark.ts` | Render/ref/property metrics |
| `src/diagnostics/benchmarkDocuments.ts` | 10 / 100 / 500 fixtures |
| `src/diagnostics/benchmarkLoader.ts` | Dev LoadDocument helper |
| `src/components/CanvasEditor/nodes/nodeRenderCompare.ts` | Shared memo comparator |
| `tests/performance/` | Fixture + stability tests |
| `tests/components/konvaNodeRefRegistry.test.ts` | Registry unit tests |

## Gate for Asset Engine

- [x] No render loops
- [x] Stable Konva refs
- [x] 500-element layout under budget
- [x] Baseline documented
- [x] `npm test` / `npm run build` green

**Next phase:** Asset Engine can rely on `KonvaNodeRefRegistry` + memoized node pattern for new asset types.
