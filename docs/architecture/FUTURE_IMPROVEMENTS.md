# Future Improvements — Classified Backlog

**Rule:** Never implement automatically from this list. Each item needs explicit product/architecture approval.  
**Constraint:** Official commerce flow must remain (ADR-0004):

```text
Editor → Save → Woo persistence → CPT → Cart → Resume → Re-edit → Order
```

---

## SEGURO (tooling / docs / shields — still explicit PR)

Safe items that do not change contracts, UX, or payloads:

| Item | Notes |
|------|--------|
| Add `npm run lint` + ESLint config | Documented gap in QUALITY_PIPELINE |
| Add `npm run typecheck` alias | Mirror `tsc --noEmit` from build |
| Add `npm run regression:verify` / `contracts:verify` aliases | Wrap existing suites |
| Extend CI workflow to ideal pipeline | After scripts exist |
| Dead export cleanup when unused | Verify with grep + tests |
| Expand fitness / HR coverage for new LL entries | Docs+tests only |

**Done (do not re-do as “improvements”):** TEMP removal (INV-11), PDP `escapeHtml` (INV-13), CONTRACTS / RISK / HR pack, RELEASE/QUALITY/GOVERNANCE/LESSONS/STATUS docs.

---

## Requer ADR

| Item | Why ADR | Maps to |
|------|---------|---------|
| Bind persistence token to session/product | Authz semantics | L1 |
| Close iframe only after add-to-cart ACK | Host close timing | L2 |
| Reject invalid lifecycle in PHP (no coerce) | Server acceptance | L7 |
| Ban Local-only resume when commerce intent | Composite fallthrough | L4 |
| Split `customizationId` ≠ `sessionId` in production | Identity model | INV-2 |
| Unify document store (CPT vs transient) | Document location | L3 |
| Gate/cancel autosave after finalize | Race | L6 |
| Sequence Save until `commerceMode=true` | Early Save race | L5 |

---

## Requer mudança de contrato

| Item | Contract impact |
|------|-----------------|
| New REST schema versions (`/2`) | Fingerprint + PayloadValidator + clients |
| Cart payload field rename/remove | `eko.commerce.cart/1` break |
| Session/document schema reshape | persistence schemas |
| Lifecycle state add/remove | FITNESS-6 + fingerprint + INV-4 |

---

## Requer mudança de UX

| Item | UX impact |
|------|-----------|
| Explicit “waiting for cart” before close | iframe / PDP feedback (pairs with L2 ADR) |
| Stronger commerce boot error UI | App error surface |
| Preview regenerate affordances | cart/PDP |

---

## Requer versão major

| Item | Why major |
|------|-----------|
| Redesign official commerce flow | ADR-0004 replace + RELEASE major |
| Permanent `customizationId` ≠ `sessionId` as required domain rule | Hosts assuming equality |
| Removing deprecated `WooCommerceAdapter` / `bootWooCommerceFromUrl` public paths | External integrators |
| Changing postMessage commerce event names | Host themes/plugins |

---

## Explicitly out of scope for “hardening only” PRs

- Redesigning Save / Resume / Cart UX
- Changing happy-path lifecycle edges
- “Fixing” ADR-0003 L1–L7 without the ADR decision above
- Inventing missing npm scripts mid-mission without a dedicated tooling PR
