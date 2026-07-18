/**
 * Historical regression shields — ensure past incidents stay permanently protected.
 * @see docs/architecture/HISTORICAL_REGRESSIONS.md
 */
import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const pluginRoot = path.join(root, 'integrations/woocommerce/eko-print-studio')

async function read(rel: string): Promise<string> {
  return readFile(path.join(root, rel), 'utf8')
}

describe('Historical Regressions (HR registry)', () => {
  it('registry document lists HR shields and official flow', async () => {
    const doc = await read('docs/architecture/HISTORICAL_REGRESSIONS.md')
    expect(doc.includes('HR-01')).toBe(true)
    expect(doc.includes('HR-19')).toBe(true)
    expect(doc.includes('Editor → Save → Woo persistence → CPT → Cart → Resume')).toBe(true)
    expect(doc.includes('JsonMetaPersistence')).toBe(true)
    expect(doc.includes('INV-9')).toBe(true)
  })

  it('HR-01…03: JsonMetaPersistence remains the slash-safe writer', async () => {
    const helper = await readFile(path.join(pluginRoot, 'services/JsonMetaPersistence.php'), 'utf8')
    expect(helper.includes('wp_slash')).toBe(true)
    expect(helper.includes('RuntimeException')).toBe(true)
    const repo = await readFile(path.join(pluginRoot, 'services/SessionRepository.php'), 'utf8')
    expect(repo.includes('JsonMetaPersistence')).toBe(true)
  })

  it('HR-04: App never silent-standalones commerce boot', async () => {
    const app = await read('src/App.tsx')
    expect(app.includes('INV-9')).toBe(true)
    expect(app.includes('falling back to standalone')).toBe(false)
  })

  it('HR-09…10: SessionRepository forces identity metas', async () => {
    const repo = await readFile(path.join(pluginRoot, 'services/SessionRepository.php'), 'utf8')
    expect(repo.includes('_eko_session_id')).toBe(true)
    expect(repo.includes('_eko_customization_id')).toBe(true)
    expect(repo.includes('JsonMetaPersistence')).toBe(true)
    expect(repo.includes('persist verification failed')).toBe(true)
  })

  it('HR-11 / ADR-0003: close/cart race documented, not silently redesigned', async () => {
    const adr = await read('docs/architecture/ADR-0003-known-limitations.md')
    expect(adr.includes('notifyHostClose')).toBe(true)
    expect(adr.includes('L2')).toBe(true)
    expect(adr.includes('Requires ADR')).toBe(true)
  })

  it('HR-12: cart contract fingerprint still present', async () => {
    const fp = JSON.parse(
      await read('tests/architecture/fixtures/rest-contract-fingerprint.json'),
    ) as { cartRequiredFields: string[]; schemas: Record<string, string> }
    expect(fp.cartRequiredFields.length).toBeGreaterThan(0)
    expect(fp.schemas.cart).toBeTruthy()
  })

  it('HR-13: Composite does not treat Local-only as commercial success', async () => {
    const composite = await read('src/providers/CompositePersistenceProvider.ts')
    expect(composite.includes('throw err') || composite.includes('throw error')).toBe(true)
  })

  it('HR-18: no TEMP debug on critical paths', async () => {
    const banned =
      /TEMP RUNTIME DEBUG|TEMP DEBUG|console\.(log|info|warn|error)\(\s*['"`]\[(LOAD|EDIT)\]/
    for (const file of [
      'src/providers/CompositePersistenceProvider.ts',
      'src/adapters/woocommerce/WooCommercePersistenceProvider.ts',
      'integrations/woocommerce/eko-print-studio/assets/js/host-bridge.js',
    ]) {
      expect(banned.test(await read(file))).toBe(false)
    }
  })

  it('HR-19: host-bridge escapeHtml present', async () => {
    const bridge = await readFile(path.join(pluginRoot, 'assets/js/host-bridge.js'), 'utf8')
    expect(bridge.includes('escapeHtml')).toBe(true)
  })

  it('risk matrix and stability docs exist with Level 4 definition', async () => {
    const risk = await read('docs/architecture/RISK_MATRIX.md')
    expect(risk.includes('JsonMetaPersistence')).toBe(true)
    expect(risk.includes('SIM')).toBe(true)
    const stability = await read('docs/architecture/STABILITY.md')
    expect(stability.includes('Nível 4')).toBe(true)
    expect(stability.includes('Arquiteturalmente blindado')).toBe(true)
    const status = await read('docs/architecture/ARCHITECTURE_STATUS.md')
    expect(status.includes('Nível 4')).toBe(true)
  })
})
