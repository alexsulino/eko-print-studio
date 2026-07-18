## Summary

<!-- What and why (not only what). -->

## Architectural gate (INV-10)

Before requesting review, answer:

- [ ] Does this change touch persistence, resume, lifecycle, cart, preview, host bridge, or REST?
- [ ] If yes: does it violate any rule in [`docs/architecture/invariants.md`](../docs/architecture/invariants.md)?
- [ ] Does it break a [System Guarantee](../docs/architecture/SYSTEM_GUARANTEES.md) or [Contract](../docs/architecture/CONTRACTS.md)?
- [ ] Does this preserve [ADR-0004](../docs/architecture/ADR-0004-official-commerce-flow.md) official flow?
- [ ] Does it touch ADR-0003 L1–L7? → **no quick-fix**; follow-up ADR required
- [ ] Release level appropriate per [RELEASE_POLICY](../docs/architecture/RELEASE_POLICY.md)?
- [ ] Was an Architectural Invariant / lifecycle / REST contract changed? → tests + fingerprint updated?
- [ ] Is a new or replacement ADR required?
- [ ] Was any official helper bypassed (`JsonMetaPersistence`, `applyLifecycle`, …)?
- [ ] Was TEMP / `[LOAD]` / `[EDIT]` debug reintroduced?
- [ ] Was business logic duplicated instead of extended at the single ownership point?
- [ ] `npm run architecture:verify` passes locally?

## Test plan

- [ ] `npm run architecture:verify`
- [ ] Manual path if commerce/persistence touched: Save → cart → Edit → resume

## Docs

- [ ] ADR / invariants / CONTRIBUTING updated when architecture changed
