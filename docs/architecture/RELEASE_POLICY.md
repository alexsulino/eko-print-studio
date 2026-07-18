# Release Policy — Eko Print Studio

**Status:** Official release governance  
**Priority:** Bound to [STABILITY](./STABILITY.md) · [QUALITY_PIPELINE](./QUALITY_PIPELINE.md) · [INV-10](./invariants.md)  
**Rule:** No production ship skips a level. Architecture truth docs override informal “ship it” pressure.

## Official commerce flow (immutable across releases)

```text
Editor → Save → WooCommerce Persistence → CPT → Cart → Resume → Re-edit → Order
```

Any release that changes this flow requires a **major** version + ADR (see [ADR-0004](./ADR-0004-official-commerce-flow.md)).

---

## Ladder

```text
Nível 0  Experimento
    ↓
Nível 1  Feature pronta
    ↓
Nível 2  Testes unitários passando
    ↓
Nível 3  Architecture Verify
    ↓
Nível 4  Regression Verify
    ↓
Nível 5  Release Candidate
    ↓
Produção
```

---

## Nível 0 — Experimento

| Field | Content |
|-------|---------|
| **Objetivo** | Explorar hipóteses sem compromisso de merge/produção. |
| **Requisitos** | Branch isolada ou worktree; sem alteração de contratos `/1`; sem merge em `main`/`master`. |
| **Quem aprova** | Autor (auto). |
| **Entrada** | Ideia ou spike com escopo limitado. |
| **Saída** | Descartar **ou** promover a Nível 1 com escopo escrito. |

---

## Nível 1 — Feature pronta

| Field | Content |
|-------|---------|
| **Objetivo** | Comportamento desejado implementado e revisável. |
| **Requisitos** | Código completo no escopo; sem TEMP debug em paths críticos (INV-11); docs tocadas se arquitetura mudar. |
| **Quem aprova** | Autor + revisor de código (peer). |
| **Entrada** | Spike aceito ou ticket com critérios de aceite. |
| **Saída** | PR aberto; checklist INV-10 iniciado. |

**Proibido:** Alterar Save / Resume / Cart / Preview / payloads / lifecycle sem ADR.

---

## Nível 2 — Testes unitários passando

| Field | Content |
|-------|---------|
| **Objetivo** | Regressões de unidade detectáveis automaticamente. |
| **Requisitos** | `npm test` verde; novos testes para cláusulas novas de invariantes/contratos. |
| **Quem aprova** | Autor (CI local) + revisor. |
| **Entrada** | Nível 1 completo. |
| **Saída** | Suite Vitest relevante passa. |

---

## Nível 3 — Architecture Verify

| Field | Content |
|-------|---------|
| **Objetivo** | Constituição estrutural intacta (invariants, fitness, domain isolation). |
| **Requisitos** | `npm run architecture:verify` → Architecture Score **100%**; PR template INV-10 preenchido. |
| **Quem aprova** | CI Architecture gate + revisor arquitetural (quando PR toca commerce/persistence/REST/host). |
| **Entrada** | Nível 2 completo. |
| **Saída** | Gate architecture verde no PR. |

---

## Nível 4 — Regression Verify

| Field | Content |
|-------|---------|
| **Objetivo** | Escudos de regressões históricas (HR) e contratos permanecem. |
| **Requisitos** | Historical Regressions suite (parte de `architecture:verify` hoje); checklist HR em [HISTORICAL_REGRESSIONS](./HISTORICAL_REGRESSIONS.md); se existir `npm run regression:verify` / `contracts:verify` no futuro — obrigatórios (ver [QUALITY_PIPELINE](./QUALITY_PIPELINE.md)). |
| **Quem aprova** | CI + revisor quando toca áreas HR-01…HR-19. |
| **Entrada** | Nível 3 completo. |
| **Saída** | Nenhum HR sem cobertura; fingerprint REST intacto ou versionado. |

---

## Nível 5 — Release Candidate

| Field | Content |
|-------|---------|
| **Objetivo** | Candidato a produção com verificação manual do fluxo oficial. |
| **Requisitos** | Níveis 2–4 verdes; build de produção (`npm run build`); plugin Woo empacotado se release incluir adapter; smoke manual: Save → CPT → Cart → Resume → Re-edit; CHANGELOG atualizado; sem itens ADR-0003 “quick-fixed”. |
| **Quem aprova** | Mantenedor do release (product/architecture owner). |
| **Entrada** | Nível 4 completo + tag `rc.*` ou branch `release/*`. |
| **Saída** | RC aprovado ou rejeitado com lista de bloqueios. |

---

## Produção

| Field | Content |
|-------|---------|
| **Objetivo** | Artefato estável para merchants/integrators. |
| **Requisitos** | RC aprovado; tag SemVer; notas de release; deploy alinhado editor + plugin da mesma linha; [ARCHITECTURE_STATUS](./ARCHITECTURE_STATUS.md) ainda válido. |
| **Quem aprova** | Release owner + (se breaking) aprovação explícita de major. |
| **Entrada** | Nível 5 aprovado. |
| **Saída** | Produção; incidentes voltam ao HR registry se novos. |

---

## SemVer & architecture

| Change type | Version | Gate |
|-------------|---------|------|
| Docs / fitness / shields only | patch (or docs-only) | Nível 3+ |
| Behavior-compatible fix inside contracts | patch/minor | Nível 4–5 |
| New optional field, same schema `/1` | minor + fingerprint note | Nível 4–5 |
| Break REST/SDK/host contract or official flow | **major** + ADR | Full ladder + ADR acceptance |

## Related

- [QUALITY_PIPELINE.md](./QUALITY_PIPELINE.md)
- [FUTURE_IMPROVEMENTS.md](./FUTURE_IMPROVEMENTS.md) — never auto-implement
- [ADR-0003](./ADR-0003-known-limitations.md) — no quick-fixes on L1–L7
