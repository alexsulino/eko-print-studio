# Immutable Contracts — Eko Print Studio

**Status:** Explicit contracts (must not change without a new schema version + ADR)  
**Priority:** Bound to [Invariants](./invariants.md) · [System Guarantees](./SYSTEM_GUARANTEES.md)  
**Fingerprint:** `tests/architecture/fixtures/rest-contract-fingerprint.json`

## Official commerce flow (immutable)

```text
Editor → Save → WooCommerce Persistence → CPT → Cart → Resume → Re-edit → Order
```

This sequence is the product contract. Hardening must **preserve** it. See [INV-12](./invariants.md).

---

## REST (`eko.* /1`)

| Contract | Schema / marker | Owner |
|----------|-----------------|--------|
| Cart payload | `eko.commerce.cart/1` | `PayloadValidator.php`, `Routes::add_to_cart` |
| Order payload | `eko.commerce.order/1` | `PayloadValidator.php`, `OrderPersistence` |
| Session payload | `eko.persistence.session/1` | `Routes::put_session` / GET sessions |
| Document payload | `eko.persistence.document/1` | `Routes` document endpoints |
| Customization | `eko.customization/1` | `src/types/customization.ts` |

**Rule:** Incompatible field/rename/removal → **new** schema version + fingerprint update + ADR. Never silently reshape `/1`.

Fitness: **FITNESS-5**.

---

## Commerce SDK

| Surface | Contract |
|---------|----------|
| Boot | `bootCommerceFromUrl` → `CommerceProvider` → `openPersonalization` |
| Start vs resume | `sessionId` present → `resume()`; absent → `start()` (exclusive) |
| Finalize | `finalize()` → host postMessage cart payload → host add-to-cart |
| Fail-fast | Commerce intent never silent-standalone (INV-9) |

Owners: `HostCommerceProvider.ts`, `PersonalizationSessionManager.ts`, `EkoPrintStudio.ts`, `App.tsx`.

---

## Host Bridge

| Surface | Contract |
|---------|----------|
| Source of truth | REST Customization resolve — **not** `sessionStorage` |
| Cache | `sessionStorage` optional UX only |
| Cart edit | `startFromCartEdit` passes `customizationId` |
| PDP status | Text nodes escaped before `innerHTML` (INV-13) |
| Close | `notifyHostClose` after cart path — known race documented in [ADR-0003](./ADR-0003-known-limitations.md) |

Owner: `assets/js/host-bridge.js`.

---

## WooCommerce persistence

| Surface | Contract |
|---------|----------|
| JSON meta | **Only** `JsonMetaPersistence` (INV-1 / ADR-0002) |
| Identity (v1) | `record.id === customizationId === _eko_session_id === _eko_customization_id` on CPT |
| Upsert | Write → verify readable → else fail (`eko_persist_failed`) |
| Document | CPT `_eko_session_document` is resume truth; transient may exist for short-lived editor docs (see ADR-0003) |

Owner: `SessionRepository.php`.

---

## Payload shapes (frozen fields)

### Cart (required)

Fingerprint `cartRequiredFields` — must remain present in `PayloadValidator`. Typical: product/quantity, `sessionId` / `customizationId`, preview, lifecycle, schema version.

### Session

Record + optional `documentJson`. Lifecycle must be one of fingerprint `lifecycleStatuses`.

### Preview

Belongs to the same Customization (INV-7). Cart/order must not substitute another session’s preview.

### Document JSON

Editor document serialized string. Round-trip via `JsonMetaPersistence` when stored on CPT.

---

## Lifecycle

States and happy path are frozen in:

- `CUSTOMIZATION_TRANSITIONS` (`src/types/customization.ts`)
- fingerprint `lifecycleStatuses`
- INV-4 / G5

Invalid transitions must **throw** (SDK) / be rejected or coerced only where ADR-0003 documents current PHP behavior.

---

## IDs

| ID | Role |
|----|------|
| `customizationId` | Permanent business identity |
| `sessionId` | Active edit / resume key |
| v1 equality | Compatibility — **not** a permanent domain rule (INV-2) |

APIs and reopen flows **prefer** `customizationId`.

---

## Change control

1. Does the change alter any contract above?  
2. If yes → new schema version and/or ADR — **not** a silent patch.  
3. `npm run architecture:verify` must pass.  
4. INV-10 PR checklist.
