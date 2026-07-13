import { useMemo, useRef, useState } from 'react'
import { DocumentHealth } from '@/core/document/DocumentHealth'
import { LayoutResolver } from '@/core/layout'
import { loadBenchmarkDocument } from '@/diagnostics/benchmarkLoader'
import { BENCHMARK_ELEMENT_COUNTS, type BenchmarkSize } from '@/diagnostics/benchmarkDocuments'
import { getEditorDiagnosticsSnapshot } from '@/diagnostics/editorDiagnostics'
import {
  getRuntimeBenchmarkSnapshot,
  isBenchmarkMode,
  setBenchmarkMode,
} from '@/diagnostics/runtimeBenchmark'
import { useEditorStore } from '@/store/editorStore'

interface DiagnosticsPanelProps {
  onClose: () => void
}

/** Dev-only diagnostics overlay — stripped from production bundles via import.meta.env.DEV gates. */
export function DiagnosticsPanel({ onClose }: DiagnosticsPanelProps) {
  const document = useEditorStore((s) => s.document)
  const activePageId = useEditorStore((s) => s.activePageId)
  const activeSurfaceId = useEditorStore((s) => s.activeSurfaceId)
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const viewport = useEditorStore((s) => s.viewport)
  const [benchmarkMode, setBenchmarkModeState] = useState(isBenchmarkMode())

  const metrics = getEditorDiagnosticsSnapshot()
  const runtime = getRuntimeBenchmarkSnapshot()

  const layoutRecalcRef = useRef(0)

  const layout = useMemo(() => {
    if (!document) return null
    if (import.meta.env.DEV) {
      layoutRecalcRef.current += 1
      // eslint-disable-next-line no-console
      console.debug('[Eko DEV] Diagnostics layout recalc', layoutRecalcRef.current)
    }
    return LayoutResolver.resolve(document, {
      pageId: activePageId,
      surfaceId: activeSurfaceId,
    })
  }, [document, activePageId, activeSurfaceId])

  const health = useMemo(
    () => {
      if (!document) return null
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[Eko DEV] Diagnostics health recalc')
      }
      return DocumentHealth.check(document)
    },
    [document],
  )

  const renderNodes = layout?.elements.filter((el) => el.type !== 'group').length ?? 0
  const groups = document?.elements.filter((el) => el.type === 'group').length ?? 0

  return (
    <aside className="diagnostics-panel" aria-label="Eko Diagnostics">
      <header className="diagnostics-header">
        <h2>Eko Diagnostics</h2>
        <button type="button" onClick={onClose} aria-label="Fechar diagnóstico">
          ×
        </button>
      </header>

      <section>
        <h3>Document</h3>
        <dl className="diagnostics-dl">
          <div>
            <dt>type</dt>
            <dd>{document?.type ?? '—'}</dd>
          </div>
          <div>
            <dt>schemaVersion</dt>
            <dd>{document?.schemaVersion ?? '—'}</dd>
          </div>
          <div>
            <dt>pages</dt>
            <dd>{document?.pages?.length ?? 0}</dd>
          </div>
          <div>
            <dt>surfaces</dt>
            <dd>{document?.surfaces?.length ?? 0}</dd>
          </div>
          <div>
            <dt>regions</dt>
            <dd>{document?.regions?.length ?? 0}</dd>
          </div>
          <div>
            <dt>elements</dt>
            <dd>{document?.elements.length ?? 0}</dd>
          </div>
          <div>
            <dt>groups</dt>
            <dd>{groups}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h3>Renderer</h3>
        <dl className="diagnostics-dl">
          <div>
            <dt>resolved elements</dt>
            <dd>{layout?.elements.length ?? metrics.lastResolvedElements}</dd>
          </div>
          <div>
            <dt>render nodes</dt>
            <dd>{renderNodes || metrics.lastRenderNodes}</dd>
          </div>
          <div>
            <dt>stage width</dt>
            <dd>{viewport.stageWidth || metrics.lastStageWidth}</dd>
          </div>
          <div>
            <dt>stage height</dt>
            <dd>{viewport.stageHeight || metrics.lastStageHeight}</dd>
          </div>
          <div>
            <dt>zoom</dt>
            <dd>{viewport.zoom.toFixed(4)}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h3>Selection</h3>
        <dl className="diagnostics-dl">
          <div>
            <dt>selected elements</dt>
            <dd>{selectedIds.length ? selectedIds.join(', ') : '—'}</dd>
          </div>
          <div>
            <dt>active surface</dt>
            <dd>{activeSurfaceId ?? '—'}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h3>Performance</h3>
        <dl className="diagnostics-dl">
          <div>
            <dt>initial render time</dt>
            <dd>
              {metrics.initialRenderMs !== null ? `${metrics.initialRenderMs} ms` : '—'}
            </dd>
          </div>
          <div>
            <dt>element count</dt>
            <dd>{document?.elements.length ?? metrics.lastRenderElementCount}</dd>
          </div>
          <div>
            <dt>last property update</dt>
            <dd>
              {runtime.lastPropertyUpdateMs !== null
                ? `${runtime.lastPropertyUpdateMs} ms`
                : '—'}
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h3>Runtime baseline</h3>
        <dl className="diagnostics-dl">
          <div>
            <dt>CanvasEditor renders</dt>
            <dd>{runtime.canvasEditorRenderCount}</dd>
          </div>
          <div>
            <dt>nodeMapVersion</dt>
            <dd>
              {runtime.nodeMapVersion} ({runtime.nodeMapVersionBumps} bumps)
            </dd>
          </div>
          <div>
            <dt>registry callbacks</dt>
            <dd>{runtime.registryCallbackCount}</dd>
          </div>
          <div>
            <dt>registry handler calls</dt>
            <dd>{runtime.registryHandlerCalls}</dd>
          </div>
        </dl>
        <label className="diagnostics-benchmark-toggle">
          <input
            type="checkbox"
            checked={benchmarkMode}
            onChange={(e) => {
              setBenchmarkMode(e.target.checked)
              setBenchmarkModeState(e.target.checked)
            }}
          />
          Benchmark mode (verbose console)
        </label>
        <div className="diagnostics-benchmark-actions">
          {(['small', 'medium', 'large'] as BenchmarkSize[]).map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => {
                loadBenchmarkDocument(size)
              }}
            >
              Load {size} ({BENCHMARK_ELEMENT_COUNTS[size]})
            </button>
          ))}
        </div>
      </section>

      {health ? (
        <section>
          <h3>Health</h3>
          <p className={health.valid ? 'diagnostics-ok' : 'diagnostics-bad'}>
            {health.valid ? 'valid' : `${health.errors.length} error(s)`}
            {health.warnings.length ? ` · ${health.warnings.length} warning(s)` : ''}
          </p>
          {health.errors.length > 0 ? (
            <ul className="diagnostics-list">
              {health.errors.map((issue) => (
                <li key={`${issue.code}-${issue.message}`}>{issue.message}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <p className="diagnostics-hint">Atalho: Ctrl+Shift+D · Somente desenvolvimento</p>
    </aside>
  )
}
