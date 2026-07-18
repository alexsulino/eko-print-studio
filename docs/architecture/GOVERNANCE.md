# Governance Map — Critical Areas

**Status:** Ownership & coverage matrix  
**Rule:** Every critical area must have docs + ADR (or explicit “covered by”) + invariant + tests + fitness/contract/HR linkage + owner + evolution strategy.  
**Never change behavior to “complete” this matrix — only documentation/tests/shields.**

## Official flow

```text
Editor → Save → Woo Persistence → CPT → Cart → Resume → Re-edit → Order
```

---

## Coverage matrix

| Área | Docs | ADR | Invariant | Testes | Fitness | Contrato | HR | Owner | Evolução |
|------|------|-----|-----------|--------|---------|----------|-----|-------|----------|
| Persistência JSON WP | ADR-0002, CONTRIBUTING | 0002 | INV-1 | JsonMeta* | 1–2 | CONTRACTS | HR-01…03 | `JsonMetaPersistence.php` | Só via ADR substituta |
| Identity / IDs | CONTRACTS, INV-2 | 0004 (flow), 0003 L | INV-2 | ArchInv, lifecycle | — | CONTRACTS IDs | HR-09…10 | `SessionRepository`, boot | Split ids = major + ADR |
| Source of truth | INV-3, CONTRACTS | 0003 L4 | INV-3 | ArchInv, host | — | CONTRACTS Host | HR-13 | Composite, host-bridge | Ban Local resume = ADR |
| Lifecycle | INV-4, types | 0003 L7 | INV-4 | CustomizationLifecycle | 6 | fingerprint | HR-08,14 | `applyLifecycle`, PayloadValidator | New state = ADR + fingerprint |
| Resume | INV-5 | 0004 | INV-5 | ArchInv, SDK | 4 | CONTRACTS SDK | HR-04 | `openPersonalization` | No start-on-miss |
| Save / persist integrity | INV-6 | 0002 | INV-6 | Session persist | 9 | session schema | HR-06…07,15–17 | SessionRepository | No partial OK |
| Preview | INV-7 | — (bound INV-7) | INV-7 | Woo plugin, export | — | Preview contract | HR-05 | Cart/Order/Presenter | Regenerate = UX ADR |
| Cart binding | INV-8 | 0004 | INV-8 | Woo plugin | 5 | cart `/1` | HR-12 | CartPersistence, host | Field change = `/2` |
| Commerce fail-fast | INV-9 | 0004 | INV-9 | ArchInv | 3 | CONTRACTS | HR-04 | `App.tsx`, boot | Boot UX = UX class |
| Change control | INV-10, RELEASE | 0001/10 | INV-10 | PR template | 10 | — | checklist | Maintainers | Process only |
| No TEMP debug | INV-11 | — | INV-11 | Fitness 11, HR | 11 | — | HR-18 | Critical path owners | Ban only |
| Official flow freeze | ADR-0004, CONTRACTS | **0004** | INV-12 | ArchInv, Hist | 12 | CONTRACTS | flow | Architecture | Major to redesign |
| Host XSS / PDP | INV-13 | — | INV-13 | ArchInv | — | Host Bridge | HR-19 | host-bridge.js | Escape only |
| Domain isolation | SYSTEM_GUARANTEES | 0001 | — | Fitness 7–8 | 7–8 | — | — | `src/core` | Layer rule |
| Known limitations | ADR-0003, RISK | **0003** | (documented) | Hist HR-11 | — | — | HR-11 | Architecture | Follow-up ADRs only |
| REST contracts | CONTRACTS, fingerprint | — | G10 | Fitness 5 | 5 | `/1` schemas | HR-12 | PayloadValidator, Routes | New version only |
| Releases / pipeline | RELEASE, QUALITY | — | INV-10 | CI architecture | 10/12 | — | — | Release owner | Add scripts via SEGURO PR |
| Lessons / status | LESSONS, ARCH_STATUS | — | — | Fitness 12 docs | 12 | — | LL↔HR | Architecture | Living docs |

“—” = covered by linked artifact; not a gap requiring code change.

---

## Owners (canonical modules)

| Owner module | Responsibility |
|--------------|----------------|
| `services/JsonMetaPersistence.php` | Only JSON meta write path |
| `services/SessionRepository.php` | CPT identity + upsert verify |
| `src/sdk/commerce/*` | Lifecycle + session manager |
| `src/providers/commerce/*` | Boot + host commerce |
| `src/App.tsx` | INV-9 commerce surface |
| `assets/js/host-bridge.js` | Host glue, cache≠truth, PDP escape |
| `services/CartPersistence.php` | Cart line ↔ customization |
| `rest/Routes.php` + `PayloadValidator.php` | REST `/1` |
| `docs/architecture/*` | Constitution & governance |

## Evolution strategy (global)

1. Propose change → check INV / CONTRACTS / HR / ADR-0003.  
2. If behavior/contract → new ADR (+ schema version if needed).  
3. If docs/shields only → patch under RELEASE Nível 3+.  
4. Never auto-implement [FUTURE_IMPROVEMENTS](./FUTURE_IMPROVEMENTS.md).
