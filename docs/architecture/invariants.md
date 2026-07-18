# Architectural Invariants — Eko Print Studio

**Status:** Canonical constitution  
**Priority:** Maximum — overrides informal docs and ad-hoc refactors  
**Related:** [System Guarantees](./SYSTEM_GUARANTEES.md) · [ADRs](./README.md) · [CONTRIBUTING](../../CONTRIBUTING.md) · `npm run architecture:verify`

## Purpose

ADRs record **why** a decision was made.  
**Invariants** define **what must always remain true**.

This document is the permanent contract between Core, SDK, adapters, and the WooCommerce plugin. Any change that violates an invariant must be **rejected** until a replacement ADR amends this constitution and tests are updated.

Principles: Clean Architecture · DDD · Design by Contract · Fail Fast · single points of maintenance.

---

## How to use

1. Before merging: answer INV-10 checklist (also in PR template).
2. Every invariant has **Architectural Regression Tests** — none may exist without tests.
3. Prefer centralizing enforcement in one helper/module (e.g. `JsonMetaPersistence`, `applyLifecycle`), not duplicated checks.

---

## INV-1 — WordPress JSON meta persistence

| Field | Content |
|-------|---------|
| **Name** | WordPress JSON Meta Persistence |
| **Objective** | JSON stored in WP meta must round-trip identically through encode → store → decode. |
| **Motivation** | `update_metadata()` applies `wp_unslash()`, which strips JSON escapes and caused production `Syntax error`, 500 on PUT `/sessions`, and broken `resume()` / cart re-edit (ADR-0002). |
| **Rule** | All JSON post/order meta writes go **exclusively** through `JsonMetaPersistence`. Never `update_post_meta($json)` or `add_meta_data(..., wp_json_encode(...))` outside the helper. Failures throw `RuntimeException` — never silent null. |
| **Expected flow** | PHP value → `wp_json_encode` → `JsonMetaPersistence` → `wp_slash` → `update_post_meta` / metadata API → `get_post_meta` → `json_decode` → same value |
| **Forbidden** | Raw `update_post_meta`/`add_meta_data` with JSON; removing `wp_slash`; ignoring `json_decode` errors; soft-fail on write |
| **If violated** | Corrupt CPT/order meta → `load_post` null → persist verification fail → commerce broken |
| **Owners** | `integrations/.../services/JsonMetaPersistence.php`, `SessionRepository.php`, `OrderPersistence.php` |
| **Tests** | `tests/persistence/JsonMetaPersistenceInvariant.test.ts`; `tests/commerce/WooCommercePlugin.test.ts` (ADR-0002 audit); `tests/architecture/ArchitecturalInvariants.test.ts` (INV-1) |

**ADR:** [ADR-0002](./ADR-0002-wordpress-json-persistence.md)

---

## INV-2 — Customization is the business identity

| Field | Content |
|-------|---------|
| **Name** | Customization Identity |
| **Objective** | `customizationId` is the permanent business identity of a personalization. |
| **Motivation** | `sessionId` is the editor/persistence resume key for an active edit session. v1 often sets them equal for compatibility — that is **not** a permanent domain rule. |
| **Rule** | New code must **not** assume `customizationId === sessionId` forever. APIs and reopen flows prioritize `customizationId`. Persistence may still key by the resume id passed from the host. |
| **Expected flow** | Host/API → prefer `customizationId` → resolve Customization → pass resume key to SDK → repository load |
| **Forbidden** | Hard-coding equality as a domain invariant; dropping `customizationId` from URLs/payloads; using only `sessionId` for cart line identity when `customizationId` exists |
| **If violated** | Reopen/cart/order attach to the wrong entity when ids diverge in a future version |
| **Owners** | `CustomizationResolver.php`, `bootCommerceFromUrl.ts`, `HostCommerceProvider.ts`, `CartPersistence.php`, `types/customization.ts` |
| **Tests** | `tests/customization/CustomizationLifecycle.test.ts`; `tests/architecture/ArchitecturalInvariants.test.ts` (INV-2) |

---

## INV-3 — Official source of truth

| Field | Content |
|-------|---------|
| **Name** | Repository Source of Truth |
| **Objective** | The persisted Customization (CPT / `SessionRepository`) is the only official state. |
| **Motivation** | Host `sessionStorage` / editor `localStorage` / preview caches exist for UX speed only. Treating them as truth caused false resumes and orphan flows. |
| **Rule** | On conflict, **Repository wins**. Caches may hint ids but must not invent Customizations. |
| **Expected flow** | Reopen → REST resolve Customization → resume from repository → optional cache refresh |
| **Forbidden** | Resuming solely from `sessionStorage`; inventing `sessionId` from cache when repository has no hit; Local-only persist counting as commercial success |
| **If violated** | Editor opens empty/wrong art; cart shows personalization that cannot resume |
| **Owners** | `host-bridge.js`, `CustomizationResolver.php`, `CompositePersistenceProvider.ts`, `WooCommercePersistenceProvider.ts` |
| **Tests** | `tests/commerce/WooCommercePlugin.test.ts` (host bridge / customization resolve); `tests/persistence/SessionPersistenceProvider.test.ts`; `tests/architecture/ArchitecturalInvariants.test.ts` (INV-3) |

---

## INV-4 — Lifecycle

| Field | Content |
|-------|---------|
| **Name** | Customization Lifecycle |
| **Objective** | Business lifecycle transitions are explicit, directed, and fail-fast. |
| **Motivation** | Silent status drift desynchronizes cart, CPT, and SDK memory. |
| **Rule** | Valid states: `created`, `editing`, `saved`, `finalized`, `cart_attached`, `ordered`, `cancelled`. Happy path: `editing` → `saved` → `finalized` → `cart_attached` → `ordered`. Also reopen edges (`* → editing`) per `CUSTOMIZATION_TRANSITIONS`. Invalid transitions **throw**. |
| **Expected flow** | `applyLifecycle(record, next)` → assert → persist |
| **Forbidden** | Skipping states without a defined edge; swallowing invalid transitions; writing arbitrary lifecycle strings without `applyLifecycle` / server equivalent |
| **If violated** | Illegal states in CPT/cart; re-edit/order attach undefined |
| **Owners** | `src/types/customization.ts`, `src/sdk/commerce/CustomizationLifecycle.ts`, `PersonalizationSessionManager.ts`, `Routes.php` (`mark_customization_cart_attached`) |
| **Tests** | `tests/customization/CustomizationLifecycle.test.ts`; `tests/architecture/ArchitecturalInvariants.test.ts` (INV-4) |

---

## INV-5 — Resume

| Field | Content |
|-------|---------|
| **Name** | Resume Over Start |
| **Objective** | When a Customization id is present, the editor **resumes** that entity. |
| **Motivation** | Calling `start()` on reopen duplicates identity and orphans the cart line. |
| **Rule** | If `customizationId` (or resolved resume id) is present → `resume()`. On failure → **error** (no empty document, no silent new session). |
| **Expected flow** | URL/boot ids → `openPersonalization({ sessionId: resumeId })` → `manager.resume` → load document |
| **Forbidden** | `start()` when resume id is known; falling back to blank template on resume miss; inventing a new `psess_*` |
| **If violated** | Duplicate customizations; cart edit opens wrong/new art |
| **Owners** | `EkoPrintStudio.openPersonalization`, `HostCommerceProvider.start`, `PersonalizationSessionManager.resume`, `bootCommerceFromUrl.ts` |
| **Tests** | `tests/customization/CustomizationLifecycle.test.ts` (resume); `tests/commerce/WooCommerceAdapter.test.ts`; `tests/architecture/ArchitecturalInvariants.test.ts` (INV-5) |

---

## INV-6 — Save integrity

| Field | Content |
|-------|---------|
| **Name** | Immediate Persist Readback |
| **Objective** | After `save` / `autosave` / `finalize`, a GET of the same id returns the persisted object. |
| **Motivation** | Partial writes caused verification failures and false commercial success. |
| **Rule** | No partial persistence. Woo path: PUT success implies CPT readable; `JsonMetaPersistence` + `SessionRepository::upsert` verification enforce this. |
| **Expected flow** | `saveSession` → remote PUT → (server) upsert + verify get → client accepts record |
| **Forbidden** | Treating Local-only mirror as commercial OK; skipping persist verification; returning 200 without readable CPT |
| **If violated** | Resume 404 after Save; cart without recoverable Customization |
| **Owners** | `SessionRepository::upsert`, `JsonMetaPersistence`, `CompositePersistenceProvider`, `WooCommercePersistenceProvider`, `Routes::put_session` |
| **Tests** | `tests/persistence/SessionPersistenceProvider.test.ts`; `tests/commerce/WooCommercePlugin.test.ts` (persist_failed); `tests/customization/CustomizationLifecycle.test.ts`; `tests/architecture/ArchitecturalInvariants.test.ts` (INV-6) |

---

## INV-7 — Preview belongs to the Customization

| Field | Content |
|-------|---------|
| **Name** | Preview Ownership |
| **Objective** | Preview is part of the personalization record, not a shared/global blob. |
| **Motivation** | Wrong preview on cart/PDP misleads merchants and attaches art to the wrong line. |
| **Rule** | Preview is generated/stored with the session record; cart/order reuse that payload; never substitute another session’s preview. |
| **Expected flow** | save/finalize → ExportProvider preview → record.preview → cart.preview → cart/order display |
| **Forbidden** | Regenerating unrelated preview for a line; serving PDP preview from a different customizationId |
| **If violated** | Wrong thumbnail in cart/order; production mismatch |
| **Owners** | `PersonalizationSessionManager`, export providers, `CartPersistence`, `PreviewPresenter`, `OrderPersistence` |
| **Tests** | `tests/commerce/WooCommercePlugin.test.ts` (preview.png / presenter); `tests/export/ExportProvider.test.ts`; `tests/architecture/ArchitecturalInvariants.test.ts` (INV-7) |

---

## INV-8 — Cart line ↔ Customization

| Field | Content |
|-------|---------|
| **Name** | One Cart Line One Customization |
| **Objective** | Each cart item maps to exactly one Customization. |
| **Motivation** | Shared ids caused overwrite of unrelated lines and wrong re-edit targets. |
| **Rule** | Line uniqueness keys off `customizationId` (fallback session id). Edit always opens **that** customization. |
| **Expected flow** | finalize → add-to-cart → line meta with ids → Edit → `startFromCartEdit` → resolve by id → resume |
| **Forbidden** | Reusing another line’s customization; edit button without `data-customization-id` when payload has one |
| **If violated** | Editing A updates B; orphan lines |
| **Owners** | `CartPersistence.php`, `Routes::add_to_cart`, `host-bridge.js` |
| **Tests** | `tests/commerce/WooCommercePlugin.test.ts`; `tests/architecture/ArchitecturalInvariants.test.ts` (INV-8) |

---

## INV-9 — Commerce boot must not silent-fallback

| Field | Content |
|-------|---------|
| **Name** | Commerce Fail Fast |
| **Objective** | When the URL/intent is commerce, the app must not silently become standalone. |
| **Motivation** | Silent `editor.bootstrap()` after failed resume made Save download `.eko.json` while the merchant believed cart flow was active. |
| **Rule** | Commerce intent (`templateId` / `sessionId` / `customizationId`) → boot commerce or **surface an explicit error**. Never silently enable standalone Save download. |
| **Expected flow** | Detect commerce → `bootCommerceFromUrl` → success `commerceMode=true` **or** error UI / thrown stage |
| **Forbidden** | Catch-all `.catch(() => editor.bootstrap())` on commerce boot; Save downloading `.eko.json` while host expected cart |
| **If violated** | False “Save worked” as file download; cart never updated |
| **Owners** | `src/App.tsx`, `bootCommerceFromUrl.ts`, `commerceBootStage.ts` |
| **Tests** | `tests/architecture/ArchitecturalInvariants.test.ts` (INV-9) |

---

## INV-10 — Compatibility gate

| Field | Content |
|-------|---------|
| **Name** | Change Control Gate |
| **Objective** | Changes to persistence, resume, lifecycle, cart, preview, host bridge, or REST must not violate invariants silently. |
| **Motivation** | Without a gate, refactors reintroduce production incidents. |
| **Rule** | Every such PR must answer: *Does this violate any Architectural Invariant?* If yes → refuse until a replacement ADR + test updates land. |
| **Expected flow** | Author fills PR checklist → reviewer verifies tests/ADR → merge |
| **Forbidden** | Bypassing helpers; duplicating business rules; merging without checklist |
| **If violated** | Unreviewed architectural drift |
| **Owners** | `.github/PULL_REQUEST_TEMPLATE.md`, `CONTRIBUTING.md`, this document |
| **Tests** | `tests/architecture/ArchitecturalInvariants.test.ts` (INV-10 checklist presence); human review |

---

## INV-11 — No temporary debug instrumentation on critical paths

| Field | Content |
|-------|---------|
| **Name** | Production Path Cleanliness |
| **Objective** | Critical commerce/persistence/host paths must not ship TEMP runtime debug that logs tokens, URLs, or full response bodies. |
| **Motivation** | TEMP `[LOAD]` / `[EDIT]` instrumentation leaked persistence tokens and polluted production consoles (HR-18). |
| **Rule** | Forbid markers: `TEMP RUNTIME DEBUG`, `TEMP DEBUG`, `console.*( '[LOAD]'`, `console.*( '[EDIT]'` in `src/` commerce/persistence adapters and `host-bridge.js`. |
| **Expected flow** | Diagnose with local-only tooling → remove before merge → FITNESS-11 fails if reintroduced |
| **Forbidden** | Leaving TEMP tags in Composite / Woo persistence / host-bridge; logging `persistenceToken` |
| **If violated** | Secret leakage; noise masking real errors |
| **Owners** | `CompositePersistenceProvider.ts`, `WooCommercePersistenceProvider.ts`, `host-bridge.js` |
| **Tests** | FITNESS-11; `HistoricalRegressions.test.ts`; INV-11 in `ArchitecturalInvariants.test.ts` |

---

## INV-12 — Official commerce flow is immutable

| Field | Content |
|-------|---------|
| **Name** | Official Flow Immutability |
| **Objective** | The stabilized commerce sequence must not be redesigned by drive-by changes. |
| **Motivation** | Months of incidents converged on one working path; silent redesigns reintroduce orphans and standalone Saves. |
| **Rule** | Flow is: **Editor → Save → WooCommerce Persistence → CPT → Cart → Resume → Re-edit → Order**. Hardening may only add shields. Behavioral redesign requires ADR + major/contract review ([CONTRACTS](./CONTRACTS.md), [ADR-0004](./ADR-0004-official-commerce-flow.md)). |
| **Expected flow** | Same sequence end-to-end |
| **Forbidden** | Skipping CPT; treating Local as commercial truth; Save→download while host expects cart; resume→silent start |
| **If violated** | Regression of HR-04…HR-17 class incidents |
| **Owners** | All commerce/persistence/host modules; constitution docs |
| **Tests** | Docs presence + `HistoricalRegressions.test.ts`; INV-12 |

---

## INV-13 — Host bridge PDP HTML escaping

| Field | Content |
|-------|---------|
| **Name** | Host Bridge XSS Guard |
| **Objective** | User/document-controlled strings must not execute as HTML in PDP status. |
| **Motivation** | `documentName` was interpolated into `innerHTML` (HR-19). |
| **Rule** | `host-bridge.js` must escape text (e.g. `escapeHtml`) before PDP `innerHTML` interpolation. |
| **Expected flow** | Resolve state → escape name/labels/time → render |
| **Forbidden** | Raw `documentName` / i18n strings concatenated into `innerHTML` without escape |
| **If violated** | Stored XSS on product page |
| **Owners** | `assets/js/host-bridge.js` |
| **Tests** | ArchitecturalInvariants INV-13; HistoricalRegressions HR-19 |

---

## Architectural Regression Tests

| Invariant | Primary automated coverage |
|-----------|----------------------------|
| INV-1 | `JsonMetaPersistenceInvariant.test.ts`, Woo plugin ADR-0002 audit |
| INV-2 | `CustomizationLifecycle.test.ts`, `ArchitecturalInvariants.test.ts` |
| INV-3 | Host-bridge / composite persistence contracts, `ArchitecturalInvariants.test.ts` |
| INV-4 | `CustomizationLifecycle.test.ts` |
| INV-5 | Lifecycle resume tests, WooCommerceAdapter reopen |
| INV-6 | Session persistence + persist_failed contracts |
| INV-7 | Export + cart preview contracts |
| INV-8 | CartPersistence / host-bridge source contracts |
| INV-9 | `ArchitecturalInvariants.test.ts` (App.tsx source) |
| INV-10 | PR template + CONTRIBUTING presence |
| INV-11 | FITNESS-11; HistoricalRegressions |
| INV-12 | CONTRACTS + HISTORICAL_REGRESSIONS docs; HistoricalRegressions |
| INV-13 | `ArchitecturalInvariants.test.ts` (host-bridge escapeHtml) |

Suite entrypoint: `tests/architecture/ArchitecturalInvariants.test.ts`  
Run: `npm test` / `npm run architecture:verify`.

**Rule:** When an invariant gains a new clause, add or extend a test in the same PR. No invariant without tests.

---

## Priority

```text
Architectural Invariants (this file)
        ↓
Accepted ADRs
        ↓
Module docs / README principles
        ↓
Implementation convenience
```

If conflict: **invariants win** until amended by ADR.
