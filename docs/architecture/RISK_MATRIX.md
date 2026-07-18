# Risk Matrix — Critical Components

**Status:** Architecture risk register (post-audit)  
**Rule:** SIM → documented shield (invariant / fitness / ADR / test). Behavior of the official flow must not change.

Legend: **SIM** = can cause the failure mode if misused or if shields fail. **NÃO** = structurally prevented or out of component scope.

---

## Matrix

| Component | Corrupt document? | Lose preview? | Lose lifecycle? | Lose ids? | Open standalone? | Invalid cart? | Invalid JSON? | Close iframe early? | Race? | Dup persistence? | Break resume? | Break re-edit? |
|-----------|-------------------|---------------|-----------------|-----------|------------------|---------------|---------------|---------------------|-------|------------------|---------------|----------------|
| `JsonMetaPersistence` | NÃO* | NÃO* | NÃO | NÃO | NÃO | NÃO | NÃO* | NÃO | NÃO | NÃO | NÃO* | NÃO* |
| `SessionRepository` | SIM | SIM | SIM | SIM | NÃO | NÃO | SIM | NÃO | NÃO | SIM | SIM | SIM |
| `CompositePersistence` | NÃO | NÃO | NÃO | NÃO | NÃO† | NÃO | NÃO | NÃO | NÃO | SIM‡ | SIM† | SIM† |
| `WooCommercePersistenceProvider` | NÃO | NÃO | NÃO | NÃO | NÃO | NÃO | NÃO | NÃO | NÃO | NÃO | SIM | SIM |
| `PersonalizationSessionManager` | SIM | SIM | SIM | SIM | NÃO | SIM | NÃO | NÃO | SIM§ | SIM§ | SIM | SIM |
| `HostCommerceProvider` / boot | NÃO | NÃO | NÃO | SIM | SIM¶ | NÃO | NÃO | NÃO | NÃO | NÃO | SIM | SIM |
| `App.tsx` Save / commerceMode | NÃO | NÃO | NÃO | NÃO | SIM¶ | NÃO | NÃO | SIM | SIM# | NÃO | NÃO | NÃO |
| `host-bridge.js` | NÃO | SIM | NÃO | SIM | NÃO | SIM | NÃO | SIM | SIM | NÃO | SIM | SIM |
| `PayloadValidator` | NÃO | NÃO | SIM** | SIM | NÃO | SIM | NÃO | NÃO | NÃO | NÃO | NÃO | SIM |
| `CartPersistence` | NÃO | SIM | SIM | SIM | NÃO | SIM | SIM | NÃO | NÃO | NÃO | NÃO | SIM |
| `Routes.php` (REST) | SIM | SIM | SIM | SIM | NÃO | SIM | SIM | NÃO | NÃO | SIM | SIM | SIM |
| `OrderPersistence` | NÃO | SIM | SIM | SIM | NÃO | NÃO | SIM | NÃO | NÃO | NÃO | NÃO | NÃO |

\* Helper prevents corruption when used; bypassing it reintroduces HR-01.  
† Primary miss → Local fallthrough can fake resume (INV-3 tension; ADR-0003).  
‡ Primary + Local mirror on save (by design); commercial path must rethrow on primary fail.  
§ In-flight autosave vs finalize race (ADR-0003).  
¶ Without INV-9 / missing restUrl+token (ADR-0003).  
# Save before `commerceMode=true` (ADR-0003).  
\*\* PHP may coerce invalid lifecycle (ADR-0003); SDK throws.

---

## SIM → shield map

| Risk | Shield |
|------|--------|
| Corrupt / invalid JSON meta | INV-1, ADR-0002, FITNESS-1/2, JsonMeta tests |
| Lose document / preview / partial persist | INV-6/7, upsert verify |
| Lose lifecycle / ids | INV-2/4, SessionRepository identity sync |
| Silent standalone | INV-9, FITNESS-3 |
| Invalid cart | FITNESS-5 fingerprint, INV-8 |
| Close iframe early / cart race | ADR-0003 (documented; change requires ADR) |
| Dup persist / Local commercial OK | INV-6 Composite rethrow |
| Break resume / re-edit | INV-5, identity heal, HR registry |
| Autosave after finalize | ADR-0003 |
| XSS PDP name | INV-13 `escapeHtml` |
| TEMP debug leaks | INV-11, FITNESS-11 |
| Token not bound to session | ADR-0003 — **Requires ADR** to fix |

---

## P0 known limitations (do not “quick-fix”)

See [ADR-0003](./ADR-0003-known-limitations.md) and [FUTURE_IMPROVEMENTS](./FUTURE_IMPROVEMENTS.md).
