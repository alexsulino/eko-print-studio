# Historical Regressions — Permanent Shields

**Status:** Mandatory regression registry  
**Rule:** Every past production incident listed here must retain documentation + invariant/fitness/test coverage.  
**Never “fix” by changing the official commerce flow.**

Official flow (immutable):

```text
Editor → Save → Woo persistence → CPT → Cart → Resume → Re-edit → Order
```

---

## Registry

| ID | Incident | Permanent shield | Tests / fitness |
|----|----------|------------------|-----------------|
| HR-01 | `wp_unslash` / `update_post_meta` stripped JSON escapes → Syntax error | `JsonMetaPersistence` + INV-1 + ADR-0002 | `JsonMetaPersistenceInvariant`, FITNESS-1/2 |
| HR-02 | JSON corrompido no CPT → `load_post` null | Helper re-read + upsert verification | INV-6, Woo persist contracts |
| HR-03 | `update_post_meta` JSON fora do helper | FITNESS-1/2 ban + INV-1 | ArchitecturalInvariants INV-1 |
| HR-04 | Resume falhou → Save baixou `.eko.json` (standalone) | INV-9: no silent `editor.bootstrap()` | FITNESS-3, INV-9 |
| HR-05 | Perda de preview no cart/order | Preview on record; Presenter from payload | INV-7 |
| HR-06 | Perda / partial document | Upsert verify; JsonMeta for document meta | INV-6, SessionRepository |
| HR-07 | Perda de revision / persistência parcial | Persist verification fail-fast | INV-6 |
| HR-08 | Lifecycle inválido / drift | `applyLifecycle` + transitions | INV-4, FITNESS-6 |
| HR-09 | Perda de `customizationId` / identity meta | SessionRepository forces id + identity metas | INV-2, SessionRepository contracts |
| HR-10 | Perda de `sessionId` / GET 404 após Save | Identity sync `_eko_session_id` | Woo identity / persist tests |
| HR-11 | Race `notifyHostClose()` vs add-to-cart | Documented limitation ADR-0003; do not “simplify” close | RISK matrix; future ADR for close-after-ACK |
| HR-12 | Add-to-cart incompleto | Cart required fields + fingerprint | FITNESS-5 |
| HR-13 | Fallback Local como sucesso comercial | Composite rethrows after local mirror | INV-6, Composite tests |
| HR-14 | Lifecycle PHP coerce (não fail-fast) | Documented ADR-0003; SDK remains strict | FITNESS-6 (TS machine) |
| HR-15 | Document parcialmente salvo | No partial commercial OK; verification | INV-6 |
| HR-16 | Preview parcialmente salvo | Same as HR-05/15 | INV-6/7 |
| HR-17 | Persistência parcial / dual write sem verify | Upsert verify + JsonMeta | INV-1/6 |
| HR-18 | TEMP debug leaks token/URL in production | INV-11 + FITNESS-11 ban | HistoricalRegressions + Fitness |
| HR-19 | XSS PDP `documentName` em `innerHTML` | `escapeHtml` in host-bridge (INV-13) | ArchitecturalInvariants INV-13 |

---

## Checklist for every PR touching commerce / persistence

Copy into review notes if the PR touches these areas:

- [ ] HR-01…03 JSON / `wp_slash` path intact  
- [ ] HR-04 no silent standalone  
- [ ] HR-05…07 document/preview/verify intact  
- [ ] HR-08…10 lifecycle + ids intact  
- [ ] HR-11 close/cart race not “fixed” without ADR  
- [ ] HR-12 cart contract fields intact  
- [ ] HR-13 Local-only not commercial success  
- [ ] HR-18 no TEMP `[LOAD]` / `[EDIT]` instrumentation  
- [ ] HR-19 PDP text still escaped  

Run: `npm run architecture:verify`.
