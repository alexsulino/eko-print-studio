# ADR-0002 — WordPress JSON Meta Persistence (wp_slash)

**Status:** Accepted (permanent architecture)  
**Date:** 2026-07-16  
**Release:** v0.8.11  
**Supersedes:** —  
**Must not change without a replacement ADR**

## Context

O adaptador WooCommerce persiste personalizações em Custom Post Type (`eko_ps_session`) e em meta de itens de pedido. Payloads incluem JSON com preview raster (base64), `documentJson`, aspas, barras invertidas e Unicode.

A API canônica de meta do WordPress é `update_post_meta()` → `update_metadata()`.

## Problem

Persistir com:

```php
update_post_meta($post_id, '_eko_session_record', wp_json_encode($record));
```

produzia meta ilegível: `json_decode` → `null`, `json_last_error` = Syntax error (~44KB).

Cadeia de falha em produção:

```text
JSON corrompido na meta
  → SessionRepository::load_post() = null
  → upsert persist verification falha
  → PUT /sessions → 500 eko_persist_failed
  → resume() quebra
  → reedição do carrinho falha
```

Lookup (`find_post_id`) e existência da meta estavam corretos; o conteúdo JSON não.

## Investigation timeline

1. Instrumentação do host (reedição) — lookup/URL OK.
2. `find_post_id` OK; `_eko_session_record` presente; `get()` / `load_post` → null.
3. `load_post` NULL #2: `json_decode` Syntax error; `record_raw_len` ≈ 44545.
4. Instrumentação de `write_identity_metas`: encode round-trip válido; corrupção no caminho `update_post_meta` / re-leitura.
5. Confirmação: `update_metadata()` aplica `wp_unslash()` antes de gravar.

## Evidence

| Observação | Valor |
|------------|--------|
| `find_post_id` | OK |
| Meta `_eko_session_record` | existe |
| `record_raw_len` | ~44KB |
| `json_decode` | null |
| `json_last_error` | 4 (Syntax error) |
| Causa | escapes JSON (`\"`, `\\`, …) removidos por `wp_unslash` |

## Root cause

`update_metadata()` (WordPress core) executa `wp_unslash($meta_value)` antes de persistir.

`wp_json_encode()` emite JSON com barras de escape. Sem compensação, esses escapes são destruídos e o JSON deixa de ser sintaticamente válido — especialmente com preview base64 / strings com aspas.

## Decision (mandatory)

1. **Toda** gravação de JSON em meta WordPress neste plugin passa por `EkoPrintStudio\Services\JsonMetaPersistence`.
2. O helper sempre:
   - valida `wp_json_encode` / string JSON;
   - aplica `wp_slash($json)` antes de APIs que fazem `wp_unslash`;
   - em post meta: re-lê com `get_post_meta`, exige igualdade byte a byte e `json_decode` íntegro;
   - lança `RuntimeException` em qualquer falha — **nunca** degrada em silêncio.
3. É **proibido**:
   - `update_post_meta(..., $json)` / `update_post_meta(..., wp_json_encode(...))` fora do helper;
   - `add_meta_data(..., wp_json_encode(...))` sem `JsonMetaPersistence::encode_for_metadata`;
   - remover `wp_slash` do helper;
   - engolir falhas de `json_decode`.
4. Alterar esta decisão exige **ADR substituta** explícita.

## Consequences

### Positive

- PUT /sessions estável com previews grandes.
- `load_post` / GET /sessions / `resume()` / reedição do carrinho consistentes.
- Order item JSON (pedido) protegido pelo mesmo contrato.
- Regressão detectável por testes de contrato + invariante simulada de `wp_unslash`.

### Negative / costs

- Uma camada a mais em writes JSON.
- `RuntimeException` em vez de meta “best effort” (intencional).

### Neutral

- Metas escalares (`_eko_session_id`, template id, etc.) continuam com `update_post_meta` direto.

## Mandatory rules for future changes

1. Nunca persistir JSON em post meta com `update_post_meta($json)` cru.
2. Sempre usar `JsonMetaPersistence` (`persist_post_meta`, `persist_post_meta_string`, `encode_for_metadata`).
3. Nunca remover `wp_slash` do helper.
4. Nunca ignorar falhas de `json_decode`.
5. Nunca substituir `RuntimeException` por retorno silencioso / null engolido no write path.
6. Novos campos JSON em meta (CPT, order item, ou qualquer `update_metadata`) devem usar o helper.
7. Testes de regressão com base64, aspas, `\`, Unicode e emoji devem continuar verdes.

## Related

- Constitution: [`invariants.md`](./invariants.md) (INV-1)
- Implementação: `integrations/woocommerce/eko-print-studio/services/JsonMetaPersistence.php`
- Consumidores: `SessionRepository`, `OrderPersistence`
- CONTRIBUTING.md — regras de desenvolvimento
- Testes: `tests/persistence/JsonMetaPersistenceInvariant.test.ts`, `tests/architecture/ArchitecturalInvariants.test.ts`, `tests/commerce/WooCommercePlugin.test.ts`
- ADR-0001 Foundation (WooCommerce fora do Core)
