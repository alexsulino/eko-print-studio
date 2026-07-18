# Architecture

## Princípios Fundamentais

**Status executivo:** [`ARCHITECTURE_STATUS.md`](./ARCHITECTURE_STATUS.md) · **Estabilidade:** [`STABILITY.md`](./STABILITY.md) (**Nível 4**)

**Prioridade máxima:** [`invariants.md`](./invariants.md) — constituição (INV-1…INV-13).

**Garantias:** [`SYSTEM_GUARANTEES.md`](./SYSTEM_GUARANTEES.md) · **Contratos:** [`CONTRACTS.md`](./CONTRACTS.md)

**Governança:** [`RELEASE_POLICY.md`](./RELEASE_POLICY.md) · [`QUALITY_PIPELINE.md`](./QUALITY_PIPELINE.md) · [`GOVERNANCE.md`](./GOVERNANCE.md)

**Memória permanente:** [`LESSONS_LEARNED.md`](./LESSONS_LEARNED.md) · [`HISTORICAL_REGRESSIONS.md`](./HISTORICAL_REGRESSIONS.md) · [`RISK_MATRIX.md`](./RISK_MATRIX.md)

**Backlog classificado:** [`FUTURE_IMPROVEMENTS.md`](./FUTURE_IMPROVEMENTS.md) — nunca implementar automaticamente.

```bash
npm run architecture:verify
```

## Fluxo oficial (imutável — ADR-0004)

```text
Editor → Save → WooCommerce Persistence → CPT → Cart → Resume → Re-edit → Order
```

## Índice

| Documento | Papel |
|-----------|--------|
| [Architecture Status](./ARCHITECTURE_STATUS.md) | Resumo executivo + auditoria |
| [Stability](./STABILITY.md) | Níveis 1–4 (atual: 4) |
| [Release Policy](./RELEASE_POLICY.md) | Ladder 0 → Produção |
| [Quality Pipeline](./QUALITY_PIPELINE.md) | Gates ideais vs scripts atuais |
| [Governance](./GOVERNANCE.md) | Owners + coverage matrix |
| [Lessons Learned](./LESSONS_LEARNED.md) | LL-001…LL-012 (não é ADR) |
| [Architectural Invariants](./invariants.md) | Constituição |
| [System Guarantees](./SYSTEM_GUARANTEES.md) | G1–G10 |
| [Contracts](./CONTRACTS.md) | Contratos imutáveis |
| [Historical Regressions](./HISTORICAL_REGRESSIONS.md) | HR-01…HR-19 |
| [Risk Matrix](./RISK_MATRIX.md) | Riscos por componente |
| [Future Improvements](./FUTURE_IMPROVEMENTS.md) | Backlog classificado |
| [ADR-0001 Foundation](../adr/0001-foundation.md) | Fundação |
| [ADR-0002 JSON meta](./ADR-0002-wordpress-json-persistence.md) | `wp_slash` |
| [ADR-0003 Known limitations](./ADR-0003-known-limitations.md) | L1–L7 |
| [ADR-0004 Official flow](./ADR-0004-official-commerce-flow.md) | Freeze do fluxo |
| [CONTRIBUTING](../../CONTRIBUTING.md) | Regras de PR |

## ADRs

| ADR | Title |
|-----|--------|
| [0001](../adr/0001-foundation.md) | Foundation decisions |
| [0002](./ADR-0002-wordpress-json-persistence.md) | WordPress JSON meta persistence |
| [0003](./ADR-0003-known-limitations.md) | Known limitations (no quick-fix) |
| [0004](./ADR-0004-official-commerce-flow.md) | Official commerce flow freeze |

## Regression & fitness

| Suite | Path |
|-------|------|
| Invariants | `tests/architecture/ArchitecturalInvariants.test.ts` |
| Fitness Functions | `tests/architecture/FitnessFunctions.test.ts` |
| Historical regressions | `tests/architecture/HistoricalRegressions.test.ts` |
| REST fingerprint | `tests/architecture/fixtures/rest-contract-fingerprint.json` |
| CI workflow | `.github/workflows/architecture.yml` |
