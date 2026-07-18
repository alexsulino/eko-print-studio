#!/usr/bin/env node
/**
 * Architecture quality gate — run fitness + invariant + contract suites.
 * Usage: npm run architecture:verify
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const suites = [
  'tests/architecture/ArchitecturalInvariants.test.ts',
  'tests/architecture/FitnessFunctions.test.ts',
  'tests/architecture/HistoricalRegressions.test.ts',
  'tests/persistence/JsonMetaPersistenceInvariant.test.ts',
  'tests/customization/CustomizationLifecycle.test.ts',
  'tests/commerce/WooCommercePlugin.test.ts',
  'tests/commerce/CommerceProvider.test.ts',
]

console.log('\n▶ Running Architecture Fitness + Contract suites…\n')

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vitest', 'run', ...suites],
  { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' },
)

const ok = result.status === 0

const reportFile = path.join(root, 'tests/architecture/.fitness-report.json')
let findings = []
if (existsSync(reportFile)) {
  try {
    const report = JSON.parse(readFileSync(reportFile, 'utf8'))
    findings = report.findings ?? []
  } catch {
    /* ignore */
  }
}

const mark = (pass) => (pass ? '✓' : '✗')

const checks = {
  Invariants: ok,
  'ADR Compliance': ok,
  Persistence: ok,
  Contracts: ok,
  Lifecycle: ok,
  Commerce: ok,
  Repository: ok,
  'Domain Isolation': ok,
  'Fitness Functions': ok && findings.length === 0,
}

const passed = Object.values(checks).filter(Boolean).length
const total = Object.keys(checks).length
const score = Math.round((passed / total) * 100)

console.log('\n========================================')
console.log('Architecture Status')
console.log('')
for (const [name, pass] of Object.entries(checks)) {
  console.log(`${mark(pass)} ${name}`)
}
console.log('')
console.log(`Architecture Score: ${score}%`)
if (!ok || findings.length) {
  console.log('')
  console.log('Architecture violated — see vitest output / tests/architecture/.fitness-report.json')
  if (findings.length) {
    for (const f of findings) {
      console.log(`  - [${f.fitness}] ${f.file}: ${f.detail}`)
    }
  }
}
console.log('========================================\n')

process.exit(ok && findings.length === 0 ? 0 : 1)
