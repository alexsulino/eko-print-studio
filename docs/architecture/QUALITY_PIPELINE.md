# Quality Pipeline — Eko Print Studio

**Status:** Architectural recommendation + current reality  
**Rule:** Do **not** invent scripts that change CI behavior without an explicit follow-up task. Document gaps; prefer adding scripts in a dedicated PR.  
**Related:** [RELEASE_POLICY](./RELEASE_POLICY.md) · [STABILITY](./STABILITY.md)

## Ideal production gate (required before Produção)

Nenhuma alteração deve chegar à produção sem que o pipeline ideal execute:

```bash
npm run lint
npm run typecheck
npm test
npm run architecture:verify
npm run regression:verify
npm run contracts:verify
npm run build
```

---

## Current reality (do not invent)

| Command | Status today | Notes |
|---------|--------------|--------|
| `npm run lint` | **Ausente** | Sem ESLint/config no repo. **Recomendação:** adicionar em PR dedicado (SEGURO / tooling). |
| `npm run typecheck` | **Ausente como script** | Typecheck ocorre via `tsc --noEmit` dentro de `npm run build`. **Recomendação:** extrair `typecheck` espelhando o build. |
| `npm test` | **Existe** | `vitest run` |
| `npm run architecture:verify` | **Existe** | Invariants + Fitness + HistoricalRegressions + commerce/lifecycle/JSON suites |
| `npm run regression:verify` | **Ausente** | Cobertura HR hoje está **dentro** de `architecture:verify` (`HistoricalRegressions.test.ts`). **Recomendação:** alias dedicado quando o pipeline for expandido. |
| `npm run contracts:verify` | **Ausente** | FITNESS-5 + fingerprint já correm em `architecture:verify`. **Recomendação:** alias dedicado. |
| `npm run build` | **Existe** | `tsc --noEmit && vite build` |

### CI hoje

`.github/workflows/architecture.yml` executa **apenas** `npm run architecture:verify` em PR/push para `main`/`master`.

**Recomendação arquitetural (não implementada aqui):** estender o workflow para a sequência ideal acima assim que os scripts faltantes existirem.

---

## Mapping to release levels

| Release level | Minimum commands (current) | Ideal (when scripts exist) |
|---------------|----------------------------|----------------------------|
| Nível 2 | `npm test` | + `lint`, `typecheck` |
| Nível 3 | `architecture:verify` | same |
| Nível 4 | Historical suite via `architecture:verify` | + `regression:verify`, `contracts:verify` |
| Nível 5 / Produção | + `npm run build` + smoke manual | full ideal list |

---

## Owner policy

- **Architecture owner** owns `architecture:verify` fitness and constitution docs.
- **Release owner** refuses Produção if ideal gates are skipped without written waiver.
- Adding missing scripts is **SEGURO AGORA** (tooling) in [FUTURE_IMPROVEMENTS](./FUTURE_IMPROVEMENTS.md) — still never auto-implemented in hardening missions.

## Waiver (exceptional)

Waivers must be written in the PR (why, risk, follow-up issue). Waivers that touch INV-1…INV-13, HR registry, or REST `/1` are **forbidden**.
