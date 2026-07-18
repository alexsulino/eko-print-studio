# 05 — Troubleshooting

## Como usar este guia

Para cada problema:

1. Confirme o **sintoma**
2. Verifique a **causa mais comum**
3. Siga o **diagnóstico**
4. Aplique a **resolução**

> **Dica:** abra DevTools (Console + Network) na página do produto e no iframe do editor ao mesmo tempo.

---

## Índice rápido

| Problema | Seção |
|----------|-------|
| Plugin não aparece | [#1](#1-plugin-não-aparece) |
| Editor não abre | [#2](#2-editor-não-abre) |
| Editor em branco | [#3](#3-editor-abre-em-branco) |
| Iframe bloqueado | [#4](#4-iframe-bloqueado) |
| Erro CORS | [#5](#5-erro-cors) |
| Erro REST / nonce | [#6](#6-erro-rest--nonce) |
| Permalinks / 404 | [#7](#7-permalinks--rota-404) |
| Erro de Session | [#8](#8-erro-de-session) |
| Payload vazio | [#9](#9-payload-vazio) |
| Preview não aparece | [#10](#10-preview-não-aparece) |
| Carrinho não salva | [#11](#11-carrinho-não-salva) |
| Pedido não salva | [#12](#12-pedido-não-salva) |
| Erro postMessage | [#13](#13-erro-postmessage) |
| Erro de build | [#14](#14-erro-de-build) |
| Botão Personalizar some | [#15](#15-botão-personalizar-não-aparece) |

---

## 1. Plugin não aparece

### Sintoma

Lista de Plugins do WordPress não mostra **Eko Print Studio for WooCommerce**.

### Possíveis causas

- Pasta copiada no lugar errado
- Arquivo principal ausente
- Nome da pasta diferente

### Diagnosticar

```text
wp-content/plugins/eko-print-studio/eko-print-studio.php  ← deve existir
```

### Resolver

1. Copie `integrations/woocommerce/eko-print-studio/` para `wp-content/plugins/eko-print-studio/`
2. Recarregue **Plugins**
3. Se aparecer aviso de WooCommerce inativo, ative o Woo primeiro

---

## 2. Editor não abre

### Sintoma

Clique em **Personalizar** e nada acontece, ou aparece mensagem de URL não configurada.

### Possíveis causas

- **URL do Editor** vazia
- Editor Vite/build offline
- JS do host não enfileirado
- Template ID ausente (botão nem renderiza — ver [#15](#15-botão-personalizar-não-aparece))

### Diagnosticar

1. **WooCommerce → Eko Print Studio** → URL preenchida?
2. Abra a URL do Editor em aba nova — carrega?
3. Console: erros em `host-bridge.js`?

### Resolver

1. Preencha a URL (`http://localhost:5173` em dev ou HTTPS em prod)
2. Suba o editor (`npm run dev` ou host do `dist/`)
3. Limpe cache do tema / plugin de otimização de JS

---

## 3. Editor abre em branco

### Sintoma

Overlay/iframe abre, mas tela branca.

### Possíveis causas

- SPA sem `index.html` servido corretamente
- Erro JS no boot commerce (`bootWooCommerceFromUrl`)
- Query params inválidos / `templateId` inexistente
- Mixed content (iframe HTTP em página HTTPS)

### Diagnosticar

1. Clique direito no iframe → Inspecionar
2. Console do iframe
3. Network: `index.html` e chunks JS

### Resolver

1. Confirme que a URL base do editor carrega sozinha
2. Verifique `templateId` na query (`template_caneca-brasil` no demo)
3. Use HTTPS no editor se a loja for HTTPS
4. Em produção, configure fallback SPA (ver [04](./04-production.md))

---

## 4. Iframe bloqueado

### Sintoma

Console: `Refused to display … in a frame` / `X-Frame-Options` / CSP `frame-ancestors`.

### Possíveis causas

- Headers do host do editor proíbem embed
- CSP do tema WordPress

### Diagnosticar

Network → resposta de `index.html` do editor → headers `X-Frame-Options`, `Content-Security-Policy`.

### Resolver

1. Remova `X-Frame-Options: DENY` no host do editor
2. Ajuste CSP para permitir a origem da loja (ou use modo **página dedicada**)
3. **A confirmar** por CDN (Cloudflare “Hotlink” / security headers)

---

## 5. Erro CORS

### Sintoma

Console fala em CORS bloqueando fetch do editor para outro domínio.

### Possíveis causas

- Código tentando chamar REST da loja **de dentro do iframe** sem proxy/nonce correto
- Configuração experimental fora do fluxo oficial

### Diagnosticar

O fluxo oficial:

1. Host WP (mesma origem) chama REST com nonce
2. Editor fala com o host via **postMessage**

Se o editor chama `fetch('https://loja…/wp-json/…')` direto, CORS aparece.

### Resolver

1. Prefira o fluxo host-bridge (postMessage → REST no parent)
2. Se precisar fetch cross-origin, configure CORS no WP (**avançado / a confirmar** no seu stack)
3. Em local, alinhe hosts ou use tunneling consciente

---

## 6. Erro REST / nonce

### Sintoma

`401` / `403` em `/wp-json/eko-print/v1/…` ou `rest_cookie_invalid_nonce`.

### Possíveis causas

- Página em cache sem nonce fresco
- Usuário deslogado + cache agressivo
- Chamada sem header `X-WP-Nonce`

### Diagnosticar

Network → request → headers. Deve haver `X-WP-Nonce`.

### Resolver

1. Recarregue a página do produto (Ctrl+F5)
2. Desative cache HTML na página produto (em staging)
3. Confirme que `host-bridge.js` recebe `ekoPrintStudio` localizado com nonce

---

## 7. Permalinks / rota 404

### Sintoma

Modo **página dedicada**: `/eko-print-studio/editor/` retorna 404.

### Possíveis causas

- Permalinks não regenerados
- Servidor sem rewrite

### Diagnosticar

Acesse `/eko-print-studio/editor/` logado como admin.

### Resolver

1. **Configurações → Links permanentes → Salvar**
2. Confirme `.htaccess` / Nginx rewrite do WordPress
3. Use **modal** temporariamente enquanto corrige

---

## 8. Erro de Session

### Sintoma

Console: `DocumentProvider required for personalization sessions` ou falha ao `openPersonalization` / `resume`.

### Possíveis causas

- SDK criado sem `documentProvider`
- `customizationId` / `sessionId` inválido ao reabrir (Customization ausente no CPT/carrinho)
- Host ainda esperava `sessionStorage` como fonte (cache vazio ≠ personalização inexistente)
- Template/master inexistente

### Diagnosticar

1. Confirme boot do app commerce (`bootCommerceFromUrl`)
2. Verifique `GET /eko-print/v1/customizations/{id}` ou `product-context` (deve retornar `customization`)
3. No reopen admin, payload deve trazer `customizationId` (+ `sessionId`)
4. Template Master selecionado bate com um id publicado no Template Registry / DocumentProvider

### Resolver

1. Use o editor oficial do repositório (já configura providers no App)
2. Não instancie `EkoPrintStudio` “nu” para commerce sem `documentProvider`
3. Para reopen, resolva **Customization** primeiro; só então passe `sessionId` para `resume()` — não dependa de `sessionStorage`

---

## 9. Payload vazio

### Sintoma

`add-to-cart` falha com validação; meta `eko_personalization` vazia.

### Possíveis causas

- Finalize não rodou (Save sem modo commerce)
- postMessage não chegou ao host
- `PayloadValidator` rejeitou schema / tamanho

### Diagnosticar

1. Network → `POST …/add-to-cart` → body
2. Console host: mensagens `eko-print-studio` / `woocommerce.cart.add`
3. Se Debug ligado: option / audit do plugin

### Resolver

1. Confirme query commerce no editor (productId, templateId)
2. Target Origin correto
3. Payload deve ter `schema: "eko.commerce.cart/1"`
4. Documento muito grande (>~1.5MB JSON) → reduzir arte / **a evoluir** limite

---

## 10. Preview não aparece

### Sintoma

Carrinho/pedido sem thumbnail visual da arte.

### Possíveis causas

- Preview atual é **domínio JSON** (`fidelity: 'domain'`) quando não há ExportProvider raster
- Tema não renderiza o campo de preview

### Diagnosticar

Inspecione meta `eko_personalization.preview.format` e `preview.fidelity`.

### Resolver

1. Espere thumbnail raster apenas se `ExportProvider` estiver configurado
2. Até lá, use summary (`documentName`, counts) na UI
3. Status: thumbnail raster no carrinho = **parcial / depende de ExportProvider**

---

## 11. Carrinho não salva

### Sintoma

Editor fecha, mas carrinho sem personalização.

### Possíveis causas

- REST `add-to-cart` falhou
- Sessão Woo / cookies bloqueados
- Validação rejeitou payload
- Redirect antes da Promise completar

### Diagnosticar

Network → `add-to-cart` status e response JSON.

### Resolver

1. Corrija erro REST (nonce, validação)
2. Teste em janela sem bloqueio de cookies de terceiros (menos crítico no fluxo same-origin REST)
3. Reative Debug e leia audit

---

## 12. Pedido não salva

### Sintoma

Pedido criado sem meta `_eko_commerce_order`.

### Possíveis causas

- Item do carrinho sem `eko_personalization`
- Hook de persistência não disparou
- Checkout custom que descarta cart item data

### Diagnosticar

1. Carrinho ainda tinha a linha “Personalização”?
2. Order item meta no admin

### Resolver

1. Garanta que o item **já** tinha meta no carrinho
2. Confirme hooks padrão do checkout
3. Evite plugins que “recriam” line items sem `cart_item_data`
4. Order item JSON deve passar por `JsonMetaPersistence` (ADR-0002) — nunca `wp_json_encode` cru em `add_meta_data`
5. Reabra o pedido: se meta sumiu, personalização precisa ser refeita

---

## 12b. PUT /sessions 500 · resume / reedição falha · `json_decode` Syntax error

### Sintoma

- Save/finalize → HTTP 500 `eko_persist_failed`
- CPT existe (`find_post_id` OK) mas `GET /sessions/{id}` / `resume()` falha
- Meta `_eko_session_record` presente (~dezenas de KB) mas `json_decode` → Syntax error

### Causa

`update_post_meta` → `wp_unslash` remove escapes do JSON. **Corrigido** em v0.8.11 via `JsonMetaPersistence` (ADR-0002).

### Resolver

1. Deploy do plugin com `services/JsonMetaPersistence.php`
2. **Save novamente** para reescrever metas antigas corrompidas
3. Não gravar JSON com `update_post_meta($json)` direto — ver [CONTRIBUTING](../CONTRIBUTING.md)

---

## 13. Erro postMessage

### Sintoma

Host não recebe `woocommerce.cart.add`; editor finaliza mas loja não reage.

### Possíveis causas

- `targetOrigin` diferente da origem real
- `source` da mensagem filtrado
- Host bridge não escutando

### Diagnosticar

No parent (loja), no Console:

```js
window.addEventListener('message', (e) => console.log('msg', e.origin, e.data))
```

Finalize no editor e veja se chega `source: 'eko-print-studio'`.

### Resolver

1. Target Origin = origem exata do editor (scheme + host + porta)
2. Confirme `host-bridge.js` ativo
3. Não abra o editor em aba solta sem host — use Personalizar na loja

---

## 14. Erro de build

### Sintoma

`npm run build` falha.

### Possíveis causas

- TypeScript errors
- Dependências desatualizadas
- Node muito antigo

### Diagnosticar

```bash
node -v
npx tsc --noEmit
npm run build
```

### Resolver

1. Use Node 20+ recomendado
2. `rm -rf node_modules && npm ci` (Unix) ou delete `node_modules` + `npm ci` (Windows)
3. Corrija erros `tsc` reportados

---

## 15. Botão Personalizar não aparece

### Sintoma

Produto publicado sem botão.

### Possíveis causas

- Template ID vazio
- Produto sem preço / não purchasable (tema esconde ações)
- Shortcode com `product_id` errado
- Cache HTML

### Diagnosticar

Meta do produto `_eko_template_id` preenchida?

### Resolver

1. Selecione um **Template Master** no produto
2. Publique o produto
3. Limpe cache
4. Teste shortcode `[eko_personalize product_id="ID"]`

---

## FAQ curto

**Posso usar Yarn?** Sim, de forma equivalente; o repo documenta npm.

**Existe pacote npm público?** Ainda não (`private: true`).

**O Core conhece WordPress?** Não. Nunca deve.

**PDF de gráfica pronto?** Pendente via ExportProvider / pipeline de produção.

---

## Checklist genérico de saúde

- [ ] Editor URL abre sozinha
- [ ] Plugin ativo + Woo ativo
- [ ] Permalinks salvos
- [ ] Template ID no produto
- [ ] Target Origin correto
- [ ] `product-context` 200
- [ ] `add-to-cart` 200 após Save
- [ ] Meta no pedido após checkout
