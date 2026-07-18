# Contributing — Eko Print Studio

## Princípios Fundamentais

A constituição do projeto é:

**[`docs/architecture/invariants.md`](docs/architecture/invariants.md)** (INV-1…INV-13)

Garantias oficiais:

**[`docs/architecture/SYSTEM_GUARANTEES.md`](docs/architecture/SYSTEM_GUARANTEES.md)**

Contratos / regressões / risco / estabilidade / governança:

- [`docs/architecture/ARCHITECTURE_STATUS.md`](docs/architecture/ARCHITECTURE_STATUS.md) — status executivo (**Nível 4**)
- [`docs/architecture/RELEASE_POLICY.md`](docs/architecture/RELEASE_POLICY.md) — ladder de release
- [`docs/architecture/QUALITY_PIPELINE.md`](docs/architecture/QUALITY_PIPELINE.md) — pipeline ideal vs atual
- [`docs/architecture/GOVERNANCE.md`](docs/architecture/GOVERNANCE.md) — owners
- [`docs/architecture/LESSONS_LEARNED.md`](docs/architecture/LESSONS_LEARNED.md) — LL-001…LL-012
- [`docs/architecture/CONTRACTS.md`](docs/architecture/CONTRACTS.md)
- [`docs/architecture/HISTORICAL_REGRESSIONS.md`](docs/architecture/HISTORICAL_REGRESSIONS.md)
- [`docs/architecture/RISK_MATRIX.md`](docs/architecture/RISK_MATRIX.md)
- [`docs/architecture/STABILITY.md`](docs/architecture/STABILITY.md)
- [`docs/architecture/FUTURE_IMPROVEMENTS.md`](docs/architecture/FUTURE_IMPROVEMENTS.md) — **nunca implementar automaticamente**

Prioridade: **Invariantes > Garantias/ADRs > docs de módulo > conveniência**.

### Fluxo oficial (imutável — INV-12 / ADR-0004)

```text
Editor → Save → WooCommerce Persistence → CPT → Cart → Resume → Re-edit → Order
```

Antes de qualquer mudança em persistência, resume, lifecycle, cart, preview, host bridge ou REST:

1. A alteração viola alguma Invariante / Garantia / Contrato?
2. Se sim → recusar até ADR substituta + testes + fingerprint (se contrato REST).
3. Limitações em [ADR-0003](docs/architecture/ADR-0003-known-limitations.md) **não** são “quick-fix”.
4. Seguir [RELEASE_POLICY](docs/architecture/RELEASE_POLICY.md) (não pular níveis até Produção).
5. Rodar `npm run architecture:verify` (e o pipeline ideal quando os scripts existirem — ver QUALITY_PIPELINE).
6. Preencher o checklist do [Pull Request template](.github/PULL_REQUEST_TEMPLATE.md).

## WordPress JSON meta persistence (INV-1 / ADR-0002)

Esta regra é **arquitetura permanente**. Detalhes em [`docs/architecture/ADR-0002-wordpress-json-persistence.md`](docs/architecture/ADR-0002-wordpress-json-persistence.md).

### Obrigatório

- Nunca persistir JSON em post meta usando `update_post_meta($id, $key, $json)`.
- Sempre utilizar o helper oficial `EkoPrintStudio\Services\JsonMetaPersistence`.
- Nunca remover `wp_slash()` do helper.
- Nunca ignorar falhas de `json_decode()`.
- Nunca substituir `RuntimeException` por retorno silencioso no caminho de gravação JSON.
- Nunca reintroduzir instrumentação `TEMP` / `[LOAD]` / `[EDIT]` em paths críticos (INV-11).

### Por quê

`update_metadata()` do WordPress aplica `wp_unslash()` antes de gravar. JSON de `wp_json_encode()` perde escapes (`\"`, `\\`) e vira Syntax error — quebrando `load_post`, PUT `/sessions`, `resume()` e reedição do carrinho.

### APIs do helper

| Método | Uso |
|--------|-----|
| `persist_post_meta($postId, $key, $value)` | Encode + slash + `update_post_meta` + re-leitura + invariante |
| `persist_post_meta_string($postId, $key, $json)` | String JSON já pronta (ex.: `documentJson`) |
| `encode_for_metadata($value)` | Encode + slash para `add_meta_data` / order item meta |

Metas **escalares** (ids, lifecycle label, timestamps) podem continuar com `update_post_meta` direto.

### Antes de mergear mudanças no plugin Woo

1. Nenhum `wp_json_encode` direto em `update_post_meta` / `add_meta_data` fora de `JsonMetaPersistence.php`.
2. `npm run architecture:verify` — Invariants + Fitness + Historical Regressions + Woo/JSON/Lifecycle/Commerce contracts.
3. Se a política de slash mudar, abrir **ADR substituta** — não um “fix rápido”.

## Outros princípios

Ver [`README.md`](README.md) · [`docs/adr/0001-foundation.md`](docs/adr/0001-foundation.md) · [`docs/architecture/README.md`](docs/architecture/README.md).
