# ADR-0004 — Official commerce flow freeze

**Status:** Accepted  
**Date:** 2026-07-16  
**Deciders:** Architecture (Principal Architect / Stability Guardian)  
**Related:** [INV-12](./invariants.md) · [CONTRACTS](./CONTRACTS.md) · [RELEASE_POLICY](./RELEASE_POLICY.md) · [LESSONS_LEARNED](./LESSONS_LEARNED.md) LL-005

## Context

After months of production incidents (JSON corruption, identity drift, silent standalone Save, partial persist), one end-to-end path proved correct and is now relied upon by merchants:

```text
Editor → Save → WooCommerce Persistence → CPT → Cart → Resume → Re-edit → Order
```

This path lived largely as tribal knowledge. Drive-by “improvements” to Save, Resume, Cart, or Host Bridge repeatedly broke adjacent stages.

## Decision

1. **Freeze** the official commerce flow as an architectural contract (INV-12).
2. Hardening may add **shields only** (docs, invariants, fitness, fail-fast messages) — never redesign the sequence.
3. Any intentional redesign of the flow requires:
   - a **new ADR** replacing or amending this one,
   - a **major** SemVer bump (hosts/plugins may depend on timing and payloads),
   - RELEASE_POLICY ladder through Produção,
   - updates to CONTRACTS, HR registry, and fingerprints as needed.
4. ADR-0003 known limitations must **not** be “fixed” under the guise of flow cleanup.

## Consequences

- Reviewers reject PRs that skip CPT, treat Local as commercial truth, or Save→download under commerce intent.
- Onboarding reads this ADR + LESSONS_LEARNED instead of relying on developer memory.
- Future channels (Shopify, etc.) may add adapters but must preserve an equivalent: persist → durable record → cart → resume → re-edit → order.

## Non-goals

No runtime, UX, API, payload, or lifecycle change is introduced by accepting this ADR.
