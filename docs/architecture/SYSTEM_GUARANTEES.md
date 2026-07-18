# System Guarantees — Eko Print Studio

**Status:** Official platform guarantees  
**Priority:** Bound to [Architectural Invariants](./invariants.md)  
**Enforcement:** Architecture Fitness Functions + `npm run architecture:verify`

## Purpose

This document states what the platform **guarantees** to merchants, integrators, and future maintainers.

Invariants say what must never be violated.  
**Guarantees** say what the system promises when invariants hold.

Fitness Functions automatically detect structural regressions that would break these guarantees.

## Scope

| In | Out |
|----|-----|
| Commerce + WooCommerce plugin persistence | Visual pixel-perfect rendering |
| SDK personalization lifecycle | Host theme CSS |
| REST contracts `eko.* /1` | Third-party plugin conflicts |
| Domain isolation (`src/core`) | Performance SLAs |

## Guarantees

### G1 — Persistence integrity

After any successful `save()` / `autosave()` / `finalize()` that completes commercially:

```text
PUT 200 → immediate GET → same persisted object
```

Partial persistence is forbidden. Local-only mirror is never commercial success.

| Responsible | Tests |
|-------------|--------|
| `SessionRepository`, `JsonMetaPersistence`, `CompositePersistenceProvider`, `WooCommercePersistenceProvider` | Fitness 1–2, 9; INV-1/6; `JsonMetaPersistenceInvariant`; Woo persist contracts |

### G2 — Resume fidelity

When a valid `customizationId` is present, `resume()` opens **that** personalization. Never a new empty document.

| Responsible | Tests |
|-------------|--------|
| `EkoPrintStudio.openPersonalization`, `HostCommerceProvider`, `PersonalizationSessionManager.resume` | Fitness 4; INV-5 |

### G3 — Identity

`customizationId` is permanent business identity. `sessionId` is the active edit/resume key. Equality in v1 is compatibility — never a permanent assumption.

| Responsible | Tests |
|-------------|--------|
| `bootCommerceFromUrl`, `CustomizationResolver`, cart/order payloads | Fitness (INV-2 contracts); INV-2 |

### G4 — Repository wins

CPT / `SessionRepository` is the official source of truth. Caches are UX only.

| Responsible | Tests |
|-------------|--------|
| `host-bridge.js`, `CustomizationResolver`, Composite persistence | INV-3; Fitness report |

### G5 — Lifecycle

Happy path: `created` → `editing` → `saved` → `finalized` → `cart_attached` → `ordered` (+ `cancelled`, reopen edges). Invalid transitions throw.

| Responsible | Tests |
|-------------|--------|
| `CUSTOMIZATION_TRANSITIONS`, `applyLifecycle` | Fitness 6; INV-4; `CustomizationLifecycle.test.ts` |

### G6 — Commerce fail-fast

Commerce intent never degrades to silent standalone. Failures are explicit. No empty editor pretending success.

| Responsible | Tests |
|-------------|--------|
| `App.tsx` | Fitness 3; INV-9 |

### G7 — Preview ownership

Preview always belongs to the same Customization. Never reuse another session’s preview.

| Responsible | Tests |
|-------------|--------|
| Session manager, Cart/Order persistence, PreviewPresenter | INV-7 |

### G8 — Cart binding

Each cart line references exactly one Customization. Edit opens that customization only.

| Responsible | Tests |
|-------------|--------|
| `CartPersistence`, `add_to_cart`, host-bridge `startFromCartEdit` | INV-8 |

### G9 — JSON meta path

All JSON meta writes go through `JsonMetaPersistence` only.

| Responsible | Tests |
|-------------|--------|
| `JsonMetaPersistence.php` | Fitness 1–2; INV-1 |

### G10 — REST contracts

Official endpoints have fixed contract versions (`eko.commerce.cart/1`, `eko.persistence.session/1`, …). Incompatible changes require a **new** schema version and fixture update.

| Responsible | Tests |
|-------------|--------|
| `PayloadValidator`, `Routes.php`, fingerprint fixture | Fitness 5 |

## Limits

Guarantees assume:

- Plugin + editor builds from the same release line
- WordPress/`update_metadata` semantics (hence `wp_slash`)
- Host passes `restUrl` + persistence token for commerce embeds

Guarantees do **not** cover corrupted metas written by older builds until a successful Save rewrites them.

Known limitations that are **documented but not eliminated** (token binding, close/cart race, Local fallthrough, etc.) live in [ADR-0003](./ADR-0003-known-limitations.md). Stability rating: [STABILITY.md](./STABILITY.md).

## Components

```text
Domain (src/core)
  → SDK (src/sdk)
  → Providers / App
  → Adapters (src/adapters)
  → Woo plugin (integrations/woocommerce)
```

Domain must not import WordPress, WooCommerce, REST clients, or adapters (Fitness 7–8).

## Verification

```bash
npm run architecture:verify
```

Runs invariants, fitness functions, Woo contracts, JSON persistence, lifecycle, and commerce contract suites, then prints the Architecture Status gate.

CI: `.github/workflows/architecture.yml` — PR must pass verify.
