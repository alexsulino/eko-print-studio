# Architecture Status — Executive Summary

**Date:** 2026-07-16  
**Stability:** [Nível 4 — Arquiteturalmente blindado](./STABILITY.md) (governance shield; see ADR-0003 for accepted residual risks)  
**Verify:** `npm run architecture:verify` → Architecture Score 100%

---

## Arquitetura atual

Plataforma Web-to-Print com Core independente de WooCommerce/React canvas details.

```text
Domain (src/core)
  → SDK (src/sdk)
  → Providers / App
  → Adapters (src/adapters)
  → Woo plugin (integrations/woocommerce)
```

Constituição: [invariants.md](./invariants.md) (INV-1…INV-13)  
Garantias: [SYSTEM_GUARANTEES.md](./SYSTEM_GUARANTEES.md) (G1–G10)  
Governança: [GOVERNANCE.md](./GOVERNANCE.md) · [RELEASE_POLICY.md](./RELEASE_POLICY.md)

---

## Fluxo oficial

```text
Editor → Save → WooCommerce Persistence → CPT → Cart → Resume → Re-edit → Order
```

Congelado por [ADR-0004](./ADR-0004-official-commerce-flow.md) / INV-12.

---

## Componentes críticos

| Componente | Papel |
|------------|--------|
| `JsonMetaPersistence` | Único writer JSON meta WP |
| `SessionRepository` | CPT identity + upsert verify |
| `CompositePersistenceProvider` | Remote primary + Local mirror (commercial = primary OK) |
| `PersonalizationSessionManager` / SDK | Lifecycle + save/finalize/resume |
| `bootCommerceFromUrl` / `HostCommerceProvider` | Commerce boot |
| `App.tsx` | INV-9 fail-fast surface |
| `host-bridge.js` | Host glue; cache ≠ truth |
| `CartPersistence` / `Routes` / `PayloadValidator` | Cart + REST `/1` |
| `PreviewPresenter` / Order persistence | Preview ownership |

---

## Single Source of Truth

| Concern | Truth |
|---------|--------|
| Document art | EkoDocument (session document on CPT for commerce resume) |
| Customization business state | CPT / `SessionRepository` |
| Lifecycle transitions | `CUSTOMIZATION_TRANSITIONS` + `applyLifecycle` (SDK) |
| Host UX hints | `sessionStorage` — **not** truth |
| Architecture rules | `docs/architecture/*` + fitness CI |

---

## Invariantes principais

INV-1 JSON meta · INV-2 identity · INV-3 repository wins · INV-4 lifecycle · INV-5 resume · INV-6 persist integrity · INV-7 preview · INV-8 cart binding · INV-9 commerce fail-fast · INV-10 change gate · INV-11 no TEMP · INV-12 flow freeze · INV-13 PDP escape

---

## Contratos

Ver [CONTRACTS.md](./CONTRACTS.md): REST `eko.*/1`, SDK boot/resume/finalize, Host Bridge, cart/session/preview/document payloads, lifecycle set, IDs.

Fingerprint: `tests/architecture/fixtures/rest-contract-fingerprint.json`.

---

## Escudos contra regressão

| Shield | Location |
|--------|----------|
| Historical HR-01…HR-19 | `HISTORICAL_REGRESSIONS.md` + tests |
| Fitness 1–12 | `FitnessFunctions.test.ts` |
| Lessons LL-001…LL-012 | `LESSONS_LEARNED.md` |
| Architecture CI | `.github/workflows/architecture.yml` |
| PR gate | INV-10 template |

---

## Pontos congelados

- Official commerce flow (ADR-0004)
- REST schema `/1` field contracts (unless new version)
- Happy-path lifecycle edges
- `JsonMetaPersistence` slash policy (ADR-0002)
- Known limitations acceptance (ADR-0003) until follow-up ADRs

---

## Mudanças proibidas (sem ADR + major/contrato)

- Alterar Save / Resume / Cart / Preview / Persistência / Host Bridge / SDK / Woo behavior “por limpeza”
- Silent standalone on commerce intent
- Bypass `JsonMetaPersistence`
- Quick-fix ADR-0003 L1–L7
- Auto-implement [FUTURE_IMPROVEMENTS](./FUTURE_IMPROVEMENTS.md)

---

## Mudanças futuras

Classificadas em FUTURE_IMPROVEMENTS: SEGURO · Requer ADR · Contrato · UX · Major.  
Pipeline ideal documentado em [QUALITY_PIPELINE.md](./QUALITY_PIPELINE.md) (scripts faltantes = recomendação, não inventados nesta missão).

---

## Critérios para versão major

- Redesign do fluxo oficial
- `customizationId` ≠ `sessionId` como regra obrigatória de domínio
- Remoção de adapters/boot paths públicos deprecated
- Mudança de nomes de eventos postMessage
- Breaking REST `/1` → `/2` (acompanha major de integração)

---

## Auditoria executiva (Fase 9)

| Pergunta | Resposta |
|----------|----------|
| A arquitetura depende da memória do desenvolvedor? | **NÃO** — constitution + LL + HR + GOVERNANCE |
| Existe fluxo sem documentação? | **NÃO** — fluxo oficial em ADR-0004/CONTRACTS/STATUS |
| Existe regra apenas no código? | **NÃO** para regras críticas (mapeadas); resíduos ADR-0003 estão documentados |
| Existe proteção ausente? | **NÃO** para HRs históricos; resíduos L1–L7 são aceitos e gated |
| Existe regressão histórica sem teste? | **NÃO** — HR registry + HistoricalRegressions suite |
| Existe contrato implícito? | **NÃO** — CONTRACTS + fingerprint; limitações explícitas em ADR-0003 |
| Existe área crítica sem owner? | **NÃO** — GOVERNANCE owners table |

---

## Maturidade por área (Fase 10)

| Área | Nota | Justificativa |
|------|------|---------------|
| Arquitetura | **Excelente** | Camadas, ADRs 0001–0004, invariants, status executivo |
| Persistência | **Excelente** | JsonMeta + INV-1 + fitness; WP slash law explicit |
| Commerce | **Muito Bom** | Fluxo congelado; residual L5 boot sequencing documentado |
| WooCommerce | **Muito Bom** | Repository/cart/REST solid; token L1 accepted risk |
| Host Bridge | **Muito Bom** | INV-3/13; race L2 documented not eliminated |
| SDK | **Excelente** | Lifecycle fail-fast; resume ternary fitness |
| Lifecycle | **Muito Bom** | SDK strict; PHP coerce L7 documented |
| Resume | **Muito Bom** | INV-5/9; Local fallthrough L4 documented |
| Save | **Muito Bom** | Verify path; L5/L6 timing documented |
| Cart | **Excelente** | `/1` fingerprint + INV-8 |
| Preview | **Excelente** | INV-7 ownership |
| Documentação | **Excelente** | Full architecture pack + lessons + release policy |
| Governança | **Excelente** | RELEASE + QUALITY + GOVERNANCE + PR/CI |
| Proteção contra regressões | **Excelente** | HR + fitness + verify 100%; residual risks ADR’d |

**Overall:** Nível 4 governance-blinded. Residual runtime risks remain **explicitly managed**, not forgotten.
