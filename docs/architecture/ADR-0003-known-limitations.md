# ADR-0003 — Known architectural limitations (documented, not silently “fixed”)

**Status:** Accepted (documentation ADR)  
**Date:** 2026-07-16  
**Deciders:** Architecture (Chief Architect review)  
**Related:** [RISK_MATRIX](./RISK_MATRIX.md) · [FUTURE_IMPROVEMENTS](./FUTURE_IMPROVEMENTS.md) · [HISTORICAL_REGRESSIONS](./HISTORICAL_REGRESSIONS.md)

## Context

After stabilizing the official commerce flow, several residual risks remain. Changing them would alter host timing, authz, or resume fallthrough — i.e. **behavior** — and therefore must not be patched ad-hoc during “hardening only” work.

## Decision

1. **Document** these limitations as known and accepted for the current major line.
2. **Forbid** “quick fixes” that change close timing, token scope, Local fallthrough, or lifecycle PHP coercion without a dedicated follow-up ADR and contract review.
3. Keep existing fail-fast shields (INV-1…INV-13, fitness) as the regression wall.

## Known limitations

### L1 — Persistence token not bound to session/product

`product-context` may issue a persistence token with a permissive permission callback. Token is not cryptographically bound to a single session id.

- **Risk:** Cross-session PUT/DELETE if token leaks.
- **Change class:** Requires ADR (authz) — see FUTURE_IMPROVEMENTS.

### L2 — `notifyHostClose` vs add-to-cart race

Host may close the iframe before cart REST completes if close is not ACK-gated.

- **Risk:** Incomplete cart attach / lost payload listeners.
- **Change class:** Requires ADR (close-after-ACK) + possible UX.

### L3 — Document dual-store

Session document may exist on CPT meta and as a short-lived transient depending on endpoint.

- **Risk:** Confusion about which store is resume truth (CPT wins for Customization resume).
- **Change class:** Requires ADR to unify.

### L4 — Composite Local fallthrough on `loadSession`

If primary returns null or throws, Local fallback may still return a hit.

- **Risk:** Tension with INV-3 (repository wins) when Local has stale data.
- **Change class:** Requires ADR to ban Local resume under commerce intent.

### L5 — Save before `commerceMode=true`

Hydration can finish before commerce boot sets `commerceMode`, so an early Save might take the standalone download path.

- **Risk:** `.eko.json` download instead of cart finalize.
- **Mitigation today:** INV-9 on boot failure; boot success sets mode. Further sequencing is ADR/UX.

### L6 — In-flight autosave after finalize

An autosave started before finalize may complete afterward and write `editing`/`saved` state.

- **Risk:** Lifecycle / document race.
- **Change class:** Requires ADR (cancel/gate autosave).

### L7 — PHP lifecycle coercion

`PayloadValidator` may coerce unrecognized lifecycle values toward a safe commercial default rather than hard-rejecting.

- **Risk:** Soft acceptance of bad clients.
- **SDK:** Still fail-fast via `applyLifecycle`.
- **Change class:** Requires ADR to reject invalid lifecycle in PHP.

## Consequences

- Maintainers treat L1–L7 as **known**, not accidental bugs to “clean up” in drive-by refactors.
- Risk matrix marks them SIM where applicable.
- Future work is classified in FUTURE_IMPROVEMENTS — never auto-implemented.

## Non-goals

This ADR does **not** change runtime behavior, REST payloads, lifecycle edges, or UX.

---

## Phase 7 review — pending items (2026-07-16)

For each limitation: validity, docs, tests, invariant, fitness, can wait. **No quick-fixes.**

### L1 — Token not bound

| Question | Answer |
|----------|--------|
| Continua válido? | **SIM** |
| Já possui documentação? | **SIM** — this ADR, RISK_MATRIX, FUTURE_IMPROVEMENTS |
| Já possui teste? | **NÃO** de authz positiva (would encode current permissive behavior); docs/HR gate only |
| Já possui invariant? | **NÃO** dedicado (security follow-up ADR) |
| Já possui fitness? | **NÃO** |
| Pode esperar? | **SIM** — until dedicated authz ADR |

### L2 — notifyHostClose vs add-to-cart

| Question | Answer |
|----------|--------|
| Continua válido? | **SIM** |
| Já possui documentação? | **SIM** — ADR-0003, HR-11, RISK_MATRIX |
| Já possui teste? | **SIM** parcial — HistoricalRegressions asserts documentation (not timing) |
| Já possui invariant? | **NÃO** de timing (would change behavior) |
| Já possui fitness? | **NÃO** |
| Pode esperar? | **SIM** — requires ADR + possible UX |

### L3 — Document dual-store

| Question | Answer |
|----------|--------|
| Continua válido? | **SIM** |
| Já possui documentação? | **SIM** — ADR-0003, CONTRACTS Woo section |
| Já possui teste? | **NÃO** estrutural dedicado |
| Já possui invariant? | **Parcial** — INV-3/6 CPT resume truth |
| Já possui fitness? | **NÃO** |
| Pode esperar? | **SIM** |

### L4 — Composite Local fallthrough

| Question | Answer |
|----------|--------|
| Continua válido? | **SIM** |
| Já possui documentação? | **SIM** — ADR-0003, RISK_MATRIX, INV-3 tension noted |
| Já possui teste? | **SIM** — Composite commercial rethrow (INV-6); fallthrough itself is current behavior |
| Já possui invariant? | **Parcial** — INV-3; ban Local resume = future ADR |
| Já possui fitness? | **NÃO** específico de fallthrough |
| Pode esperar? | **SIM** |

### L5 — Save before commerceMode

| Question | Answer |
|----------|--------|
| Continua válido? | **SIM** |
| Já possui documentação? | **SIM** — ADR-0003, RISK_MATRIX |
| Já possui teste? | **Parcial** — INV-9/FITNESS-3 cover failure path, not early-Save race |
| Já possui invariant? | **Parcial** — INV-9 |
| Já possui fitness? | **Parcial** — FITNESS-3 |
| Pode esperar? | **SIM** — sequencing ADR/UX |

### L6 — Autosave after finalize

| Question | Answer |
|----------|--------|
| Continua válido? | **SIM** |
| Já possui documentação? | **SIM** — ADR-0003, RISK_MATRIX |
| Já possui teste? | **NÃO** de corrida temporal |
| Já possui invariant? | **NÃO** de cancelamento |
| Já possui fitness? | **NÃO** |
| Pode esperar? | **SIM** |

### L7 — PHP lifecycle coercion

| Question | Answer |
|----------|--------|
| Continua válido? | **SIM** |
| Já possui documentação? | **SIM** — ADR-0003, LL-009, CONTRACTS |
| Já possui teste? | **SIM** no SDK (strict); PHP coerce is documented current behavior |
| Já possui invariant? | **SIM** no SDK (INV-4); PHP reject = future ADR |
| Já possui fitness? | **SIM** — FITNESS-6 (TS machine + fingerprint) |
| Pode esperar? | **SIM** |

**Summary:** All L1–L7 remain valid, documented, and **allowed to wait**. Evolution only via follow-up ADRs listed in FUTURE_IMPROVEMENTS.
