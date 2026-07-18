/**
 * Architecture Fitness Functions — structural CI shields.
 * @see docs/architecture/SYSTEM_GUARANTEES.md
 * @see docs/architecture/invariants.md
 */
import { describe, expect, it } from 'vitest'
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import {
  CUSTOMIZATION_TRANSITIONS,
  CUSTOMIZATION_SCHEMA,
} from '@/types/customization'

const root = process.cwd()
const pluginRoot = path.join(root, 'integrations/woocommerce/eko-print-studio')
const reportPath = path.join(root, 'tests/architecture/.fitness-report.json')

type Finding = { fitness: string; file: string; detail: string }

const findings: Finding[] = []

function fail(fitness: string, file: string, detail: string): void {
  findings.push({ fitness, file, detail })
}

async function collectFiles(dir: string, pred: (name: string) => boolean): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const out: string[] = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue
      out.push(...(await collectFiles(full, pred)))
    } else if (pred(entry.name)) {
      out.push(full)
    }
  }
  return out
}

function rel(file: string): string {
  return path.relative(root, file).replace(/\\/g, '/')
}

describe('Architecture Fitness Functions', () => {
  it('FITNESS 1–2: no JSON post meta writes outside JsonMetaPersistence', async () => {
    const phpFiles = await collectFiles(pluginRoot, (n) => n.endsWith('.php'))
    for (const file of phpFiles) {
      if (file.endsWith(`${path.sep}JsonMetaPersistence.php`)) continue
      const src = await readFile(file, 'utf8')
      if (/update_post_meta\s*\([^;]*wp_json_encode/.test(src)) {
        fail('FITNESS-1', rel(file), 'update_post_meta(...wp_json_encode)')
      }
      if (/update_post_meta\s*\([^;]*wp_slash\s*\(/.test(src)) {
        fail('FITNESS-1', rel(file), 'update_post_meta(...wp_slash) outside helper')
      }
      if (/add_meta_data\s*\([^;]*wp_json_encode/.test(src)) {
        fail('FITNESS-1', rel(file), 'add_meta_data(...wp_json_encode)')
      }
      if (/update_post_meta\s*\([^;]*_eko_session_record/.test(src)) {
        fail('FITNESS-1', rel(file), 'direct _eko_session_record write')
      }
      if (/update_post_meta\s*\([^;]*_eko_session_document/.test(src)) {
        fail('FITNESS-1', rel(file), 'direct _eko_session_document write')
      }
      // FITNESS 2: wp_json_encode then update_post_meta in same statement/nearby
      if (/wp_json_encode\s*\([^)]*\)[\s\S]{0,120}update_post_meta/.test(src)) {
        fail('FITNESS-2', rel(file), 'wp_json_encode followed by update_post_meta')
      }
    }
    expect(findings.filter((f) => f.fitness.startsWith('FITNESS-1') || f.fitness === 'FITNESS-2')).toEqual([])
  })

  it('FITNESS 3: App.tsx commerce catch must not call editor.bootstrap()', async () => {
    const app = await readFile(path.join(root, 'src/App.tsx'), 'utf8')
    expect(app.includes('INV-9')).toBe(true)
    const catchIdx = app.indexOf('.catch(')
    expect(catchIdx).toBeGreaterThanOrEqual(0)
    const catchBlock = app.slice(catchIdx, catchIdx + 900)
    if (catchBlock.includes('editor.bootstrap()')) {
      fail('FITNESS-3', 'src/App.tsx', 'editor.bootstrap() inside commerce boot catch')
    }
    expect(catchBlock.includes('editor.bootstrap()')).toBe(false)
    expect(app.includes('falling back to standalone')).toBe(false)
  })

  it('FITNESS 4: resume path must not fall through to start for the same open', async () => {
    const sdk = await readFile(path.join(root, 'src/sdk/EkoPrintStudio.ts'), 'utf8')
    const openIdx = sdk.indexOf('async openPersonalization')
    expect(openIdx).toBeGreaterThanOrEqual(0)
    const block = sdk.slice(openIdx, openIdx + 800)
    expect(block.includes('manager.resume')).toBe(true)
    expect(block.includes('manager.start')).toBe(true)
    // Exclusive ternary: sessionId ? resume : start
    expect(/options\.sessionId\s*\n?\s*\?\s*await\s+manager\.resume/.test(block)).toBe(true)
    expect(/:\s*await\s+manager\.start/.test(block)).toBe(true)
    // Forbid sequential awaits (resume then start) — not ternary alternatives
    const sequential =
      /await\s+manager\.resume\([^)]*\)\s*;\s*[\s\S]{0,40}await\s+manager\.start/.test(block)
    if (sequential) {
      fail('FITNESS-4', 'src/sdk/EkoPrintStudio.ts', 'resume() then start() for same open')
    }
    expect(sequential).toBe(false)
  })

  it('FITNESS 5: REST contract fingerprint must match PayloadValidator + Routes', async () => {
    const fingerprint = JSON.parse(
      await readFile(path.join(root, 'tests/architecture/fixtures/rest-contract-fingerprint.json'), 'utf8'),
    ) as {
      schemas: Record<string, string>
      cartRequiredFields: string[]
      lifecycleStatuses: string[]
      restRouteFragments: string[]
    }

    const validator = await readFile(path.join(pluginRoot, 'services/PayloadValidator.php'), 'utf8')
    const routes = await readFile(path.join(pluginRoot, 'rest/Routes.php'), 'utf8')
    const customizationTypes = await readFile(path.join(root, 'src/types/customization.ts'), 'utf8')

    expect(validator.includes(fingerprint.schemas.cart)).toBe(true)
    expect(validator.includes(fingerprint.schemas.order)).toBe(true)
    expect(routes.includes(fingerprint.schemas.session)).toBe(true)
    expect(routes.includes(fingerprint.schemas.document)).toBe(true)
    expect(customizationTypes.includes(fingerprint.schemas.customization)).toBe(true)
    expect(CUSTOMIZATION_SCHEMA).toBe(fingerprint.schemas.customization)

    for (const field of fingerprint.cartRequiredFields) {
      if (!validator.includes(`'${field}'`)) {
        fail('FITNESS-5', 'PayloadValidator.php', `missing required cart field ${field}`)
      }
      expect(validator.includes(`'${field}'`)).toBe(true)
    }

    for (const frag of fingerprint.restRouteFragments) {
      if (!routes.includes(frag)) {
        fail('FITNESS-5', 'Routes.php', `missing route fragment ${frag}`)
      }
      expect(routes.includes(frag)).toBe(true)
    }

    // Extract allowed_lifecycle from PHP and compare to fingerprint
    const lifeMatch = validator.match(/\$allowed_lifecycle\s*=\s*\[([^\]]+)\]/)
    expect(lifeMatch).toBeTruthy()
    const phpLifecycles = [...lifeMatch![1]!.matchAll(/'([^']+)'/g)].map((m) => m[1]!)
    expect(phpLifecycles.sort()).toEqual([...fingerprint.lifecycleStatuses].sort())
  })

  it('FITNESS 6: new lifecycle requires invariants + state machine + fingerprint alignment', async () => {
    const fingerprint = JSON.parse(
      await readFile(path.join(root, 'tests/architecture/fixtures/rest-contract-fingerprint.json'), 'utf8'),
    ) as { lifecycleStatuses: string[] }
    const invariants = await readFile(path.join(root, 'docs/architecture/invariants.md'), 'utf8')
    const guarantees = await readFile(path.join(root, 'docs/architecture/SYSTEM_GUARANTEES.md'), 'utf8')
    const adrLifecycleMention =
      (await readFile(path.join(root, 'docs/architecture/ADR-0002-wordpress-json-persistence.md'), 'utf8')) ||
      ''

    const machineKeys = Object.keys(CUSTOMIZATION_TRANSITIONS).sort()
    expect(machineKeys).toEqual([...fingerprint.lifecycleStatuses].sort())

    for (const status of fingerprint.lifecycleStatuses) {
      if (!invariants.includes(status)) {
        fail('FITNESS-6', 'invariants.md', `lifecycle ${status} not documented`)
      }
      expect(invariants.includes(status)).toBe(true)
      expect(guarantees.includes(status) || guarantees.includes('Lifecycle')).toBe(true)
    }

    // Happy-path edges must remain
    expect(CUSTOMIZATION_TRANSITIONS.editing).toContain('saved')
    expect(CUSTOMIZATION_TRANSITIONS.saved).toContain('finalized')
    expect(CUSTOMIZATION_TRANSITIONS.finalized).toContain('cart_attached')
    expect(CUSTOMIZATION_TRANSITIONS.cart_attached).toContain('ordered')

    // ADR index exists for architecture changes (0002 covers persistence; lifecycle changes need ADR note in invariants)
    expect(adrLifecycleMention.length).toBeGreaterThan(0)
    void findings
  })

  it('FITNESS 7: domain (src/core) must not import WP / Woo / adapters / React', async () => {
    const coreFiles = await collectFiles(path.join(root, 'src/core'), (n) => n.endsWith('.ts') || n.endsWith('.tsx'))
    const bannedImport = /from\s+['"](@\/adapters|@\/providers\/commerce\/stubs|react|react-dom|react-konva)['"]/
    const bannedToken =
      /wordpress|WooCommerce|wp_json_encode|update_post_meta|localStorage|sessionStorage|navigator\.clipboard|typeof window/

    for (const file of coreFiles) {
      const src = await readFile(file, 'utf8')
      const code = src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
      if (bannedImport.test(code)) {
        fail('FITNESS-7', rel(file), 'banned import (adapters/react)')
      }
      if (/from\s+['"][^'"]*woocommerce[^'"]*['"]/.test(code)) {
        fail('FITNESS-7', rel(file), 'woocommerce module import')
      }
      if (/\blocalStorage\b|\bsessionStorage\b|navigator\.clipboard/.test(code)) {
        fail('FITNESS-7', rel(file), 'browser storage/clipboard API')
      }
      expect(bannedImport.test(code)).toBe(false)
      expect(/\blocalStorage\b|\bsessionStorage\b|navigator\.clipboard/.test(code)).toBe(false)
      void bannedToken
    }
  })

  it('FITNESS 8: no forbidden layer cycles (core↛sdk/adapters; sdk↛adapters)', async () => {
    const layers: Array<{ name: string; dir: string; forbid: RegExp }> = [
      {
        name: 'core',
        dir: path.join(root, 'src/core'),
        forbid: /from\s+['"](@\/sdk|@\/adapters|@\/providers|@\/App|@\/components|@\/editor)['"]/,
      },
      {
        name: 'sdk',
        dir: path.join(root, 'src/sdk'),
        forbid: /from\s+['"](@\/adapters|@\/App)['"]/,
      },
      {
        name: 'types',
        dir: path.join(root, 'src/types'),
        forbid: /from\s+['"](@\/adapters|@\/sdk|@\/providers|@\/core)['"]/,
      },
    ]

    for (const layer of layers) {
      const files = await collectFiles(layer.dir, (n) => n.endsWith('.ts') || n.endsWith('.tsx'))
      for (const file of files) {
        const src = await readFile(file, 'utf8')
        if (layer.forbid.test(src)) {
          fail('FITNESS-8', rel(file), `${layer.name} imports forbidden outer layer`)
        }
        expect(layer.forbid.test(src)).toBe(false)
      }
    }
  })

  it('FITNESS 9: emit architecture fitness report', async () => {
    const preserved = findings.length === 0
    const report = {
      generatedAt: new Date().toISOString(),
      status: preserved ? 'Architecture preserved' : 'Architecture violated',
      findings,
      guaranteesDoc: 'docs/architecture/SYSTEM_GUARANTEES.md',
      invariantsDoc: 'docs/architecture/invariants.md',
    }
    await mkdir(path.dirname(reportPath), { recursive: true })
    await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8')
    expect(report.status).toBe('Architecture preserved')
    expect(findings).toEqual([])
  })

  it('FITNESS 10: architecture:verify script and SYSTEM_GUARANTEES exist', async () => {
    const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>
    }
    expect(pkg.scripts['architecture:verify']).toBeTruthy()
    const guarantees = await readFile(path.join(root, 'docs/architecture/SYSTEM_GUARANTEES.md'), 'utf8')
    expect(guarantees.includes('G1')).toBe(true)
    expect(guarantees.includes('G10')).toBe(true)
    expect(guarantees.includes('architecture:verify')).toBe(true)
    const script = await readFile(path.join(root, 'scripts/architecture-verify.mjs'), 'utf8')
    expect(script.includes('Architecture Status')).toBe(true)
  })

  it('FITNESS 11: no TEMP debug instrumentation on critical commerce paths', async () => {
    const critical = [
      path.join(root, 'src/providers/CompositePersistenceProvider.ts'),
      path.join(root, 'src/adapters/woocommerce/WooCommercePersistenceProvider.ts'),
      path.join(pluginRoot, 'assets/js/host-bridge.js'),
    ]
    const banned =
      /TEMP RUNTIME DEBUG|TEMP DEBUG|console\.(log|info|warn|error)\(\s*['"`]\[(LOAD|EDIT)\]/
    for (const file of critical) {
      const src = await readFile(file, 'utf8')
      if (banned.test(src)) {
        fail('FITNESS-11', rel(file), 'TEMP / [LOAD]/[EDIT] debug instrumentation')
      }
      expect(banned.test(src)).toBe(false)
    }
  })

  it('FITNESS 12: architecture constitution docs package present', async () => {
    const required = [
      'docs/architecture/CONTRACTS.md',
      'docs/architecture/HISTORICAL_REGRESSIONS.md',
      'docs/architecture/RISK_MATRIX.md',
      'docs/architecture/FUTURE_IMPROVEMENTS.md',
      'docs/architecture/STABILITY.md',
      'docs/architecture/ADR-0003-known-limitations.md',
      'docs/architecture/ADR-0004-official-commerce-flow.md',
      'docs/architecture/RELEASE_POLICY.md',
      'docs/architecture/QUALITY_PIPELINE.md',
      'docs/architecture/GOVERNANCE.md',
      'docs/architecture/LESSONS_LEARNED.md',
      'docs/architecture/ARCHITECTURE_STATUS.md',
    ]
    for (const relPath of required) {
      const src = await readFile(path.join(root, relPath), 'utf8')
      expect(src.length).toBeGreaterThan(100)
    }
    const contracts = await readFile(path.join(root, 'docs/architecture/CONTRACTS.md'), 'utf8')
    expect(contracts.includes('Editor → Save → WooCommerce Persistence → CPT → Cart → Resume')).toBe(
      true,
    )
    const status = await readFile(path.join(root, 'docs/architecture/ARCHITECTURE_STATUS.md'), 'utf8')
    expect(status.includes('Nível 4') || status.includes('Level 4')).toBe(true)
    const release = await readFile(path.join(root, 'docs/architecture/RELEASE_POLICY.md'), 'utf8')
    expect(release.includes('Nível 0')).toBe(true)
    expect(release.includes('Produção')).toBe(true)
    const lessons = await readFile(path.join(root, 'docs/architecture/LESSONS_LEARNED.md'), 'utf8')
    expect(lessons.includes('LL-001')).toBe(true)
    expect(lessons.includes('LL-012')).toBe(true)
  })
})
