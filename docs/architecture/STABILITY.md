# Stability Definition — Eko Print Studio

**Date:** 2026-07-16  
**Official flow:** Editor → Save → Woo persistence → CPT → Cart → Resume → Re-edit → Order  
**Executive summary:** [ARCHITECTURE_STATUS.md](./ARCHITECTURE_STATUS.md)

## Levels

| Level | Name | Meaning |
|-------|------|---------|
| 1 | Funciona | Happy path works in manual QA |
| 2 | Confiável | Core bugs fixed; production incidents addressed |
| 3 | Resistente a regressões | Invariants + fitness + CI gate catch known failure classes |
| 4 | Arquiteturalmente blindado | Architecture is self-explanatory: contracts, HR, lessons, release governance, owners, and known risks are explicit. Residual risks are **ADR-managed**, not tribal. Zero TEMP debt on critical paths. |

## Current verdict

### **Nível 4 — Arquiteturalmente blindado**

**Why Level 4 (governance):**

- Critical rules live in invariants, ADRs (0001–0004), CONTRACTS, HR, LESSONS_LEARNED — not developer memory.
- RELEASE_POLICY + QUALITY_PIPELINE + GOVERNANCE define how change reaches production.
- ADR-0003 L1–L7 are reviewed, documented, and forbidden as quick-fixes.
- `npm run architecture:verify` at 100%; FITNESS includes constitution doc package.
- Official flow frozen (ADR-0004 / INV-12).

**What Level 4 does *not* mean:**

- All ADR-0003 residual runtime risks are eliminated (they are **accepted and gated**).
- Ideal npm scripts (`lint`, `regression:verify`, …) all exist (gaps are documented in QUALITY_PIPELINE).

**How Level 4 is lost:**

- Merging without architecture verify; bypassing JsonMeta; silent standalone; undocumented contract change; “fixing” L1–L7 without ADR.

## Evidence package

| Artifact | Role |
|----------|------|
| `ARCHITECTURE_STATUS.md` | Executive status |
| `RELEASE_POLICY.md` | Release ladder 0→Produção |
| `QUALITY_PIPELINE.md` | Pipeline ideal vs atual |
| `GOVERNANCE.md` | Owners + coverage matrix |
| `LESSONS_LEARNED.md` | LL-001…LL-012 |
| `invariants.md` | INV-1…INV-13 |
| `SYSTEM_GUARANTEES.md` | G1–G10 |
| `CONTRACTS.md` | Explicit contracts |
| `HISTORICAL_REGRESSIONS.md` | HR-01…HR-19 |
| `RISK_MATRIX.md` | Component SIM/NÃO |
| `ADR-0002`…`0004` | Persistence, limitations, flow freeze |
| `architecture:verify` | Score gate |
