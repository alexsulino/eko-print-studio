/**
 * Architectural Invariants — regression shield (constitution).
 * @see docs/architecture/invariants.md
 */
import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import {
  CUSTOMIZATION_TRANSITIONS,
  canTransitionCustomization,
  ensureCustomizationFields,
} from '@/types/customization'
import { applyLifecycle } from '@/sdk/commerce/CustomizationLifecycle'
import type { PersonalizationSessionRecord } from '@/types/commerce'

const root = process.cwd()
const pluginRoot = path.join(root, 'integrations/woocommerce/eko-print-studio')

async function read(rel: string): Promise<string> {
  return readFile(path.join(root, rel), 'utf8')
}

describe('Architectural Invariants (docs/architecture/invariants.md)', () => {
  it('INV-10: constitution, CONTRIBUTING, and PR checklist exist', async () => {
    const invariants = await read('docs/architecture/invariants.md')
    expect(invariants.includes('INV-1')).toBe(true)
    expect(invariants.includes('INV-9')).toBe(true)
    expect(invariants.includes('INV-10')).toBe(true)
    expect(invariants.includes('INV-11')).toBe(true)
    expect(invariants.includes('INV-12')).toBe(true)
    expect(invariants.includes('INV-13')).toBe(true)
    expect(invariants.includes('Architectural Regression Tests')).toBe(true)

    const contributing = await read('CONTRIBUTING.md')
    expect(contributing.includes('invariants.md')).toBe(true)

    const pr = await read('.github/PULL_REQUEST_TEMPLATE.md')
    expect(pr.includes('Architectural gate')).toBe(true)
    expect(pr.includes('invariants.md')).toBe(true)

    const archReadme = await read('docs/architecture/README.md')
    expect(archReadme.includes('invariants.md')).toBe(true)
    expect(archReadme.includes('Princípios Fundamentais') || archReadme.includes('priority')).toBe(true)
  })

  it('INV-1: JsonMetaPersistence is the only JSON meta writer', async () => {
    const helper = await readFile(path.join(pluginRoot, 'services/JsonMetaPersistence.php'), 'utf8')
    expect(helper.includes('wp_slash')).toBe(true)
    expect(helper.includes('RuntimeException')).toBe(true)

    const { readdir } = await import('node:fs/promises')
    async function collectPhp(dir: string): Promise<string[]> {
      const entries = await readdir(dir, { withFileTypes: true })
      const files: string[] = []
      for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) files.push(...(await collectPhp(full)))
        else if (entry.name.endsWith('.php')) files.push(full)
      }
      return files
    }
    const offenders: string[] = []
    for (const file of await collectPhp(pluginRoot)) {
      if (file.endsWith(`${path.sep}JsonMetaPersistence.php`)) continue
      const src = await readFile(file, 'utf8')
      if (/update_post_meta\s*\([^;]*wp_json_encode/.test(src)) offenders.push(file)
      if (/add_meta_data\s*\([^;]*wp_json_encode/.test(src)) offenders.push(file)
      if (/update_post_meta\s*\([^;]*_eko_session_record/.test(src)) offenders.push(file)
      if (/update_post_meta\s*\([^;]*_eko_session_document/.test(src)) offenders.push(file)
    }
    expect(offenders).toEqual([])
  })

  it('INV-2: boot and host prioritize customizationId over sessionId', async () => {
    const boot = await read('src/providers/commerce/bootCommerceFromUrl.ts')
    expect(boot.includes('params.get(\'customizationId\')')).toBe(true)
    // customizationId is resolved before sessionId fallback chain
    const custIdx = boot.indexOf('params.get(\'customizationId\')')
    const sessIdx = boot.indexOf('params.get(\'sessionId\')')
    expect(custIdx).toBeGreaterThanOrEqual(0)
    expect(sessIdx).toBeGreaterThan(custIdx)

    const host = await read('src/providers/commerce/HostCommerceProvider.ts')
    expect(host.includes('options.customizationId ?? options.sessionId')).toBe(true)

    const bridge = await readFile(path.join(pluginRoot, 'assets/js/host-bridge.js'), 'utf8')
    expect(bridge.includes('customizationId')).toBe(true)
    expect(bridge.includes('buildEditorUrl')).toBe(true)
  })

  it('INV-3: host bridge treats sessionStorage as cache, not source of truth', async () => {
    const bridge = await readFile(path.join(pluginRoot, 'assets/js/host-bridge.js'), 'utf8')
    expect(bridge.includes('sessionStorage')).toBe(true)
    expect(
      bridge.includes('never the source of truth') ||
        bridge.includes('optional UX cache') ||
        bridge.includes('Official Customization'),
    ).toBe(true)
    expect(bridge.includes('resolveCustomization')).toBe(true)
    expect(bridge.includes('/customizations/') || bridge.includes('product-context')).toBe(true)
  })

  it('INV-4: invalid lifecycle transitions throw', () => {
    expect(canTransitionCustomization('created', 'ordered')).toBe(false)
    expect(CUSTOMIZATION_TRANSITIONS.editing).toContain('saved')
    expect(CUSTOMIZATION_TRANSITIONS.saved).toContain('finalized')
    expect(CUSTOMIZATION_TRANSITIONS.finalized).toContain('cart_attached')
    expect(CUSTOMIZATION_TRANSITIONS.cart_attached).toContain('ordered')

    const base = ensureCustomizationFields({
      id: 'psess_inv4',
      status: 'finalized',
      product: { productId: '1', templateId: 't' },
      documentId: 'd',
      masterId: 't',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    } as PersonalizationSessionRecord)
    expect(() => applyLifecycle(base, 'created')).toThrow(/invalid transition/)
  })

  it('INV-5: openPersonalization resumes when sessionId is provided', async () => {
    const sdk = await read('src/sdk/EkoPrintStudio.ts')
    expect(sdk.includes('options.sessionId')).toBe(true)
    expect(sdk.includes('manager.resume')).toBe(true)
    expect(sdk.includes('manager.start')).toBe(true)
    // resume branch before start
    const resumeIdx = sdk.indexOf('manager.resume')
    const startIdx = sdk.indexOf('manager.start')
    expect(resumeIdx).toBeGreaterThanOrEqual(0)
    expect(startIdx).toBeGreaterThan(resumeIdx)
  })

  it('INV-6: upsert verification and Composite do not treat Local-only as commercial success', async () => {
    const repo = await readFile(path.join(pluginRoot, 'services/SessionRepository.php'), 'utf8')
    expect(repo.includes('persist verification failed')).toBe(true)
    expect(repo.includes('JsonMetaPersistence')).toBe(true)

    const composite = await read('src/providers/CompositePersistenceProvider.ts')
    expect(composite.includes('LOCAL_ONLY') || composite.includes('rethrows') || composite.includes('throw err')).toBe(
      true,
    )
    // Must rethrow after local mirror on primary failure
    expect(composite.includes('throw err') || composite.includes('throw error')).toBe(true)
  })

  it('INV-7: cart/order preview comes from personalization payload', async () => {
    const cart = await readFile(path.join(pluginRoot, 'services/CartPersistence.php'), 'utf8')
    expect(cart.includes('PreviewPresenter')).toBe(true)
    expect(cart.includes('preview')).toBe(true)

    const order = await readFile(path.join(pluginRoot, 'services/OrderPersistence.php'), 'utf8')
    expect(order.includes('ORDER_PREVIEW_KEY') || order.includes('preview')).toBe(true)
    expect(order.includes('JsonMetaPersistence')).toBe(true)
  })

  it('INV-8: cart line keys and edit button use customization id', async () => {
    const cart = await readFile(path.join(pluginRoot, 'services/CartPersistence.php'), 'utf8')
    expect(cart.includes('customizationId')).toBe(true)
    expect(cart.includes('data-customization-id') || cart.includes('data-eko-edit-customization')).toBe(true)
    expect(cart.includes('unique_key')).toBe(true)

    const routes = await readFile(path.join(pluginRoot, 'rest/Routes.php'), 'utf8')
    expect(routes.includes('customizationId')).toBe(true)
    expect(routes.includes('add_to_cart')).toBe(true)

    const bridge = await readFile(path.join(pluginRoot, 'assets/js/host-bridge.js'), 'utf8')
    expect(bridge.includes('startFromCartEdit')).toBe(true)
    expect(bridge.includes('data-customization-id')).toBe(true)
  })

  it('INV-9: commerce boot must not silently fall back to standalone bootstrap', async () => {
    const app = await read('src/App.tsx')
    expect(app.includes('bootCommerceFromUrl')).toBe(true)
    expect(app.includes('INV-9')).toBe(true)
    expect(app.includes('commerceBootError')).toBe(true)
    expect(app.includes('falling back to standalone')).toBe(false)
    const catchIdx = app.indexOf('.catch(')
    expect(catchIdx).toBeGreaterThanOrEqual(0)
    const catchBlock = app.slice(catchIdx, catchIdx + 800)
    expect(catchBlock.includes('editor.bootstrap()')).toBe(false)
  })

  it('INV-11: critical paths have no TEMP [LOAD]/[EDIT] instrumentation', async () => {
    const files = [
      'src/providers/CompositePersistenceProvider.ts',
      'src/adapters/woocommerce/WooCommercePersistenceProvider.ts',
      'integrations/woocommerce/eko-print-studio/assets/js/host-bridge.js',
    ]
    const banned =
      /TEMP RUNTIME DEBUG|TEMP DEBUG|console\.(log|info|warn|error)\(\s*['"`]\[(LOAD|EDIT)\]/
    for (const file of files) {
      const src = await read(file)
      expect(banned.test(src)).toBe(false)
    }
  })

  it('INV-12: official commerce flow is documented as immutable', async () => {
    const contracts = await read('docs/architecture/CONTRACTS.md')
    expect(contracts.includes('Editor → Save → WooCommerce Persistence → CPT → Cart → Resume')).toBe(
      true,
    )
    const invariants = await read('docs/architecture/invariants.md')
    expect(invariants.includes('INV-12')).toBe(true)
    expect(invariants.includes('Official Flow Immutability')).toBe(true)
    const adr4 = await read('docs/architecture/ADR-0004-official-commerce-flow.md')
    expect(adr4.includes('Editor → Save → WooCommerce Persistence → CPT → Cart → Resume')).toBe(true)
  })

  it('INV-13: host-bridge escapes PDP text before innerHTML', async () => {
    const bridge = await readFile(path.join(pluginRoot, 'assets/js/host-bridge.js'), 'utf8')
    expect(bridge.includes('function escapeHtml')).toBe(true)
    const renderIdx = bridge.indexOf('function renderPdpStatus')
    expect(renderIdx).toBeGreaterThanOrEqual(0)
    const block = bridge.slice(renderIdx, renderIdx + 1400)
    expect(block.includes('var name = escapeHtml')).toBe(true)
    expect(/\+[\s\n\r]*name[\s\n\r]*\+/.test(block)).toBe(true)
    expect(block.includes('+ documentName +') || block.includes('+ state.summary.documentName +')).toBe(
      false,
    )
  })
})
