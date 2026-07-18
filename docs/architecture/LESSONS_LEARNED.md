# Lessons Learned — Eko Print Studio

**Status:** Permanent engineering memory (not an ADR)  
**Rule:** Record what we learned. Decisions belong in ADRs; shields in Invariants/HR; this file explains *why we care*.  
**Related:** [HISTORICAL_REGRESSIONS](./HISTORICAL_REGRESSIONS.md) · [ADR-0002](./ADR-0002-wordpress-json-persistence.md) · [ADR-0003](./ADR-0003-known-limitations.md) · [ADR-0004](./ADR-0004-official-commerce-flow.md)

---

## LL-001 — `wp_unslash` corrompendo JSON em post meta

| Field | Content |
|-------|---------|
| **Problema** | PUT `/sessions` → 500 `eko_persist_failed`; `json_decode` Syntax error em records ~44KB com preview. |
| **Causa** | `update_post_meta` → `update_metadata` aplica `wp_unslash`, removendo escapes `\"` / `\\` do JSON. |
| **Impacto** | CPT ilegível; resume e reedição do carrinho quebrados após Save. |
| **Como foi descoberto** | Produção / debug de persist verification após Save com preview base64. |
| **Solução definitiva** | `JsonMetaPersistence`: encode → `wp_slash` → store → re-read / fail-fast. |
| **Como impedir regressão** | INV-1, ADR-0002, FITNESS-1/2, `JsonMetaPersistenceInvariant`. |
| **Arquivos** | `JsonMetaPersistence.php`, `SessionRepository.php`, `OrderPersistence.php` |
| **Testes** | `tests/persistence/JsonMetaPersistenceInvariant.test.ts`, FITNESS-1/2 |

---

## LL-002 — JsonMetaPersistence como único writer

| Field | Content |
|-------|---------|
| **Problema** | Múltiplos call sites reintroduziam `update_post_meta($json)` sem slash. |
| **Causa** | Regra implícita só na memória / em um fix pontual. |
| **Impacto** | Qualquer PR “inocente” reabria HR-01. |
| **Como foi descoberto** | Auditoria pós-fix + fitness structural scan. |
| **Solução definitiva** | Helper único + ban fitness em todo o plugin PHP. |
| **Como impedir regressão** | INV-1, FITNESS-1/2, CONTRIBUTING, PR checklist. |
| **Arquivos** | `services/JsonMetaPersistence.php` |
| **Testes** | ArchitecturalInvariants INV-1, Fitness 1–2 |

---

## LL-003 — Resume nunca usar LocalStorage / sessionStorage como verdade

| Field | Content |
|-------|---------|
| **Problema** | Reopen “funcionava” no browser com cache e falhava sem ele / com CPT real. |
| **Causa** | Host `sessionStorage` tratado como fonte de Customization. |
| **Impacto** | Falsos resumes; órfãos; divergência cart vs editor. |
| **Como foi descoberto** | Fluxos de Edit no carrinho / PDP com cache stale. |
| **Solução definitiva** | INV-3: Repository/CPT wins; cache = UX only. |
| **Como impedir regressão** | INV-3, host-bridge comments + tests, CONTRACTS Host. |
| **Arquivos** | `host-bridge.js`, `CustomizationResolver.php`, Composite |
| **Testes** | ArchitecturalInvariants INV-3; Woo plugin host contracts |

---

## LL-004 — Commerce boot não pode cair em standalone silencioso

| Field | Content |
|-------|---------|
| **Problema** | Save baixava `.eko.json` enquanto o host esperava cart. |
| **Causa** | `App.tsx` catch do boot commerce chamava `editor.bootstrap()` (standalone). |
| **Impacto** | Falso sucesso comercial; carrinho nunca atualizado. |
| **Como foi descoberto** | QA commerce Save após resume falho / boot error. |
| **Solução definitiva** | INV-9: erro explícito; nunca silent standalone. |
| **Como impedir regressão** | INV-9, FITNESS-3, HR-04. |
| **Arquivos** | `src/App.tsx`, `bootCommerceFromUrl.ts` |
| **Testes** | ArchitecturalInvariants INV-9; FITNESS-3 |

---

## LL-005 — Save → Resume → Re-edit é um fluxo único

| Field | Content |
|-------|---------|
| **Problema** | Times otimizavam pedaços isolados e quebravam o elo CPT↔cart↔resume. |
| **Causa** | Fluxo só existia como conhecimento tribal. |
| **Impacto** | Regressões em “meio” do pipeline (persist OK, resume 404, etc.). |
| **Como foi descoberto** | Meses de incidentes encadeados (identity, JSON, INV-9). |
| **Solução definitiva** | Congelar fluxo em ADR-0004 + INV-12 + CONTRACTS. |
| **Como impedir regressão** | ADR-0004, INV-12, RELEASE_POLICY major rule. |
| **Arquivos** | Commerce stack end-to-end |
| **Testes** | HistoricalRegressions; ArchInv INV-12; FITNESS-12 |

---

## LL-006 — Identity metas devem permanecer sincronizadas

| Field | Content |
|-------|---------|
| **Problema** | product-context achava Customization; GET `/sessions` 404. |
| **Causa** | `_eko_session_id` só na criação; updates não sincronizavam identity; `record.id` divergia. |
| **Impacto** | Resume impossível; Save degradava (HR-04 chain). |
| **Como foi descoberto** | Debug de resume após Save com CPT existente. |
| **Solução definitiva** | `SessionRepository` força `record.id === customizationId` e sync de metas. |
| **Como impedir regressão** | INV-2, HR-09/10, SessionRepository contracts. |
| **Arquivos** | `SessionRepository.php` |
| **Testes** | HistoricalRegressions HR-09…10; Woo persist tests |

---

## LL-007 — Host Bridge é cola fina, não source of truth

| Field | Content |
|-------|---------|
| **Problema** | Lógica comercial espalhada no bridge; races close/cart; XSS PDP. |
| **Causa** | Bridge acumulava responsabilidades de produto. |
| **Impacto** | Listeners duplicados; iframe fecha cedo; HTML inseguro. |
| **Como foi descoberto** | Auditoria host + R2/R10/R18. |
| **Solução definitiva** | Contrato Host (cache≠truth); escapeHtml (INV-13); races em ADR-0003 (não quick-fix). |
| **Como impedir regressão** | INV-3/8/13, ADR-0003 L2, HR-11/19. |
| **Arquivos** | `assets/js/host-bridge.js` |
| **Testes** | ArchInv INV-3/8/13; Historical HR-11/19 |

---

## LL-008 — Persistência WooCommerce é comercial só se o primary OK

| Field | Content |
|-------|---------|
| **Problema** | Mirror Local fazia parecer que Save comercial sucedeu. |
| **Causa** | Composite salvava fallback e engolia falha do primary. |
| **Impacto** | Cart/resume sem CPT real. |
| **Como foi descoberto** | Contratos INV-6 / persist_failed. |
| **Solução definitiva** | Rethrow após mirror; upsert verify no servidor. |
| **Como impedir regressão** | INV-6, Composite tests, HR-13. |
| **Arquivos** | `CompositePersistenceProvider.ts`, `SessionRepository.php` |
| **Testes** | ArchInv INV-6; Session persistence; HR-13 |

---

## LL-009 — Lifecycle deve ser máquina explícita

| Field | Content |
|-------|---------|
| **Problema** | Status arbitrários dessincronizavam CPT, cart e SDK. |
| **Causa** | Strings livres sem `applyLifecycle`. |
| **Impacto** | Re-edit/order attach indefinidos. |
| **Como foi descoberto** | Drift em payloads e testes de transição. |
| **Solução definitiva** | `CUSTOMIZATION_TRANSITIONS` + `applyLifecycle` fail-fast (SDK). |
| **Como impedir regressão** | INV-4, FITNESS-6, fingerprint lifecycles. |
| **Arquivos** | `src/types/customization.ts`, `CustomizationLifecycle.ts` |
| **Testes** | `CustomizationLifecycle.test.ts`; FITNESS-6 |

**Nota:** Coerção PHP ainda documentada em ADR-0003 L7 — não “corrigir” sem ADR.

---

## LL-010 — Preview pertence à Customization

| Field | Content |
|-------|---------|
| **Problema** | Thumbnail errado no cart/PDP/order. |
| **Causa** | Preview tratado como blob global ou regenerado de outra sessão. |
| **Impacto** | Merchant vê arte errada; risco de produção. |
| **Como foi descoberto** | Contratos cart/order presenter. |
| **Solução definitiva** | INV-7: preview no record da mesma Customization. |
| **Como impedir regressão** | INV-7, HR-05, PreviewPresenter/CartPersistence. |
| **Arquivos** | Session manager, `CartPersistence`, `PreviewPresenter`, `OrderPersistence` |
| **Testes** | Woo plugin preview contracts; ArchInv INV-7 |

---

## LL-011 — Cart payload é contrato versionado

| Field | Content |
|-------|---------|
| **Problema** | Add-to-cart incompleto / campos renomeados quebravam host. |
| **Causa** | Payload tratado como JSON informal. |
| **Impacto** | Linhas inválidas; Edit sem ids. |
| **Como foi descoberto** | FITNESS-5 / fingerprint + incidentes de cart. |
| **Solução definitiva** | `eko.commerce.cart/1` + campos required no fingerprint. |
| **Como impedir regressão** | FITNESS-5, INV-8, HR-12, CONTRACTS. |
| **Arquivos** | `PayloadValidator.php`, `Routes.php`, fingerprint fixture |
| **Testes** | FITNESS-5; WooCommercePlugin cart tests |

---

## LL-012 — Limitações conhecidas não são “bugs óbvios”

| Field | Content |
|-------|---------|
| **Problema** | Tentativas de quick-fix em races/token/Local fallthrough mudavam comportamento. |
| **Causa** | Tratar ADR-0003 L1–L7 como dívida de limpeza. |
| **Impacto** | Regressões sutis de timing/authz/resume. |
| **Como foi descoberto** | Auditoria de estabilidade Nível 3→4. |
| **Solução definitiva** | ADR-0003 + FUTURE_IMPROVEMENTS classificado; proibir quick-fix. |
| **Como impedir regressão** | RELEASE_POLICY, GOVERNANCE, PR template ADR-0003 note. |
| **Arquivos** | `ADR-0003-known-limitations.md`, `FUTURE_IMPROVEMENTS.md` |
| **Testes** | HistoricalRegressions HR-11; docs FITNESS-12 |

---

## Index

| ID | Tema | HR / INV |
|----|------|----------|
| LL-001 | wp_unslash JSON | HR-01, INV-1 |
| LL-002 | JsonMeta only | HR-03, INV-1 |
| LL-003 | Cache ≠ truth | INV-3 |
| LL-004 | Commerce boot | HR-04, INV-9 |
| LL-005 | Official flow | INV-12, ADR-0004 |
| LL-006 | Identity metas | HR-09/10, INV-2 |
| LL-007 | Host Bridge | HR-11/19, INV-13 |
| LL-008 | Woo persist commercial | HR-13, INV-6 |
| LL-009 | Lifecycle machine | HR-08, INV-4 |
| LL-010 | Preview ownership | HR-05, INV-7 |
| LL-011 | Cart contract | HR-12, INV-8 |
| LL-012 | Known limitations | ADR-0003 |
