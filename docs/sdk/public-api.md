# SDK — Public API

Referência dos símbolos exportados por `@/sdk` (e tipos em `@/types/commerce` reexportados).

> **Nota:** esta API reflete o código atual (commerce Unreleased v0.8.0). Não inventa métodos futuros.

---

## Índice

1. [`EkoPrintStudio`](#ekoprintstudio)
2. [`EkoPrintStudioOptions`](#ekoprintstudiooptions)
3. [Métodos da classe](#métodos)
4. [`platformEvents`](#platformevents)
5. [React helpers](#react-helpers)
6. [Commerce helpers](#commerce-helpers)
7. [Host helpers](#host-helpers)
8. [Tipos commerce](#tipos-commerce)

---

## `EkoPrintStudio`

### Descrição

Fachada pública do editor. Adapters de loja e apps embarcados devem usar **somente** esta classe (+ tipos públicos).

### Construtor

```ts
new EkoPrintStudio(options?: EkoPrintStudioOptions)
```

| Parâmetro | Tipo | Default | Descrição |
|-----------|------|---------|-----------|
| `options.documentProvider` | `DocumentProvider?` | — | Load/save/create session |
| `options.providers` | `PlatformProviders?` | `{}` | persistence, export, … |
| `options.host` | `HostBridge?` | `createHostBridge()` | Ponte com o host |
| `options.sessionStore` | `PersonalizationSessionStore?` | in-memory interno | Persistência de sessão commerce |

**Erros:** nenhum no construtor.

**Boas práticas:** passe `documentProvider` antes de chamar APIs de personalização.

---

## `EkoPrintStudioOptions`

Ver campos na tabela do construtor.

---

## Métodos

### `load(id: string): Promise<EkoDocument>`

**Descrição:** Carrega documento via `DocumentProvider` ou `PersistenceProvider`.

**Parâmetros:** `id` — identificador do documento.

**Retorno:** `EkoDocument` aberto.

**Erros:**

- `no DocumentProvider or PersistenceProvider configured`
- `instance destroyed`

**Exemplo:**

```ts
const doc = await editor.load('doc_abc')
```

---

### `open(document: EkoDocument): EkoDocument`

**Descrição:** Define o documento atual em memória (sem I/O).

**Retorno:** o mesmo documento.

**Erros:** `instance destroyed`

```ts
editor.open(myDoc)
```

---

### `save(): Promise<EkoDocument>`

**Descrição:** Persiste o documento aberto via provider.

**Erros:**

- `no document open`
- `no DocumentProvider or PersistenceProvider configured`

```ts
const saved = await editor.save()
```

---

### `export(format?): Promise<{ mimeType; data }>`

**Descrição:** Exporta o documento.

| `format` | Requisito |
|----------|-----------|
| `'json'` (default) | Sempre (serialização de domínio) |
| `'png' \| 'pdf' \| 'svg'` | `ExportProvider` |

**Erros:**

- `no document open`
- `format "…" requires ExportProvider`

```ts
const { mimeType, data } = await editor.export('json')
```

---

### `on(event, handler): () => void`

**Descrição:** Assina evento do Event Bus. Retorna função unsubscribe.

```ts
const off = editor.on(platformEvents.DocumentOpened, (p) => console.log(p))
off()
```

---

### `off(event, handler): void`

Remove um handler específico.

---

### `register(target: EditorRegisterTarget): void`

**Descrição:** Registra extensão.

```ts
editor.register({ kind: 'plugin', plugin: myPlugin })
editor.register({ kind: 'object', definition })
editor.register({ kind: 'renderer', renderer })
editor.register({ kind: 'overlay', contributor })
editor.register({ kind: 'pass', pass })
```

---

### `getDocument(): EkoDocument | null`

Documento atual (store Creator ou campo interno).

---

### `session(): EditorSessionApi`

API imperativa do Creator (undo, zoom, createObject, notify, …).

```ts
editor.session().undo()
```

---

### `bootstrap(masterId?: string): Promise<void>`

Inicializa a sessão Creator a partir de um master/template.

```ts
await editor.bootstrap('template_caneca-brasil')
```

---

### `configureCommerce(provider: CommerceProvider): void`

Anexa o `CommerceProvider` ativo (WooCommerce / Shopify / …). Preferível a orquestrar via `bootCommerceFromUrl`.

### `getCommerce(): CommerceProvider | null`

Provider de comércio configurado, ou `null` no Creator standalone.

---

### `openPersonalization(options): Promise<PersonalizationSessionRecord>`

**Descrição:** Inicia ou retoma uma **Customization** (personalização commerce). Em v1, `sessionId` e `customizationId` são o mesmo valor. Em produção, o host chama isso através de `CommerceProvider.start()` — não de uma classe Woo.

**Parâmetros (`CommerceOpenEditorOptions`):**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `product` | `CommerceProductContext` | Contexto do SKU |
| `embedMode?` | `'modal' \| 'iframe' \| 'page'` | Default efetivo no manager: `'page'` se omitido |
| `sessionId?` | `string` | Se presente, retoma (aceita customizationId migrado) |
| `autosaveMs?` | `number` | Default `15000`; `0` desliga |

**Erros:**

- `DocumentProvider required for personalization sessions`
- `instance destroyed`

**Boas práticas:** sempre envie `templateId` válido no `product`. Reabra com o mesmo id para evitar duplicatas.

**Lifecycle (negócio):** `created → editing → saved → finalized → cart_attached → ordered` (+ cancel / re-edit).

---

### `savePersonalization(): Promise<{ record; cart }>`

Salva sessão (`lifecycle: saved`) e monta `CommerceCartPayload` com `customizationId` + `lifecycleStatus`.

---

### `finalizePersonalization(): Promise<{ record; cart }>`

Finaliza (`lifecycle: finalized`); notifica host (`personalization:finalized`).

---

### `cancelPersonalization(): Promise<PersonalizationSessionRecord>`

Cancela (`lifecycle: cancelled`); emite `personalization:cancelled`.

---

### `resumePersonalization(sessionId): Promise<PersonalizationSessionRecord>`

Retoma Customization / sessão (migra registros legados sem `customizationId`).

---

### `getPersonalizationSession(): PersonalizationSessionRecord | null`

Sessão commerce atual (inclui campos Customization) ou `null`.

---

### `generateProductionPreview(): Promise<ProductionPreviewRef>`

Gera referência de preview (domain JSON e/ou raster se ExportProvider).

---

### `buildOrderPayload(orderId, cart, lineItemId?): CommerceOrderPayload`

Monta payload de pedido (`eko.commerce.order/1`).

```ts
const order = editor.buildOrderPayload('1001', cart, '55')
```

---

### `requestEmbed(mode, payload?): void`

Publica `embed.request` no host bus (`eko.commerce`).

---

### `getHost(): HostBridge`

### `getPlugins(): PluginRegistry`

### `getProviders(): PlatformProviders`

Acesso a collaborators injetados.

---

### `importJson(raw: string): EkoDocument`

Importa JSON serializado de domínio e abre.

---

### `destroy(): void`

Libera commerce manager, desregistra plugins da instância, marca destruído. Idempotente.

**Após destroy:** qualquer método público relevante lança `EkoPrintStudio: instance destroyed`.

---

## `platformEvents`

Constantes estáveis (valor = string do fio):

| Chave | Wire |
|-------|------|
| `DocumentOpened` | `document.opened` |
| `DocumentSaved` | `document.saved` |
| `DocumentChanged` | (interno documento) |
| `SelectionChanged` | `selection.changed` |
| `ObjectCreated` / `ObjectDeleted` / `ObjectUpdated` | eventos de elemento |
| `PageChanged` | `page.changed` |
| `ZoomChanged` | `zoom.changed` |
| `ToolChanged` | `tool.changed` |
| `InteractionStarted` / `Finished` | interaction.* |
| `LayoutChanged` | layout |
| `Notify` | `ui.notify` |
| `Confirm` | `ui.confirm` |
| `SessionStarted` | `commerce.session.started` |
| `SessionSaved` | `commerce.session.saved` |
| `SessionAutosaved` | `commerce.session.autosaved` |
| `SessionFinalized` | `commerce.session.finalized` |
| `SessionCancelled` | `commerce.session.cancelled` |
| `SessionResumed` | `commerce.session.resumed` |
| `CartPayloadReady` | `commerce.cart.ready` |
| `OrderPayloadReady` | `commerce.order.ready` |
| `PreviewGenerated` | `commerce.preview.generated` |

```ts
import { platformEvents } from '@/sdk'
editor.on(platformEvents.SessionFinalized, handler)
```

---

## React helpers

| API | Descrição |
|-----|-----------|
| `EditorProvider` | Injeta `EkoPrintStudio` na árvore |
| `useEditor()` | Instância atual |
| `useEditorSnapshot()` | Snapshot para `useSyncExternalStore` |
| `useEditorSession()` | Atalho para `editorSession` |
| `useThemeMode(default?)` | Tema Creator (`canva` \| `light` \| `dark`) |

---

## Commerce helpers

| API | Descrição |
|-----|-----------|
| `PersonalizationSessionManager` | Usado internamente; exportado para hosts avançados |
| `InMemorySessionStore` | Store de sessão em memória |
| `buildProductionPreview(doc)` | Preview domain |
| `buildRasterPreview(…)` | Preview raster (ExportProvider) |

---

## Host helpers

| API | Descrição |
|-----|-----------|
| `bindPostMessageTransport(host, options)` | Liga HostBridge ↔ `postMessage` |
| `postToEditor(editorWindow, type, payload, origin?)` | Host → iframe |

**`PostMessageBridgeOptions`:**

- `targetWindow` — peer (parent)
- `targetOrigin?` — default `*`
- `channel?` — default `eko.commerce`
- `listenWindow?` — default `window`

**Contrato de mensagens:**

- Editor → Host: `source: 'eko-print-studio'`
- Host → Editor: `source: 'eko-print-studio-host'`

---

## Tipos commerce

Reexportados do SDK. Definições autoritativas em `src/types/commerce.ts`.

### `CommerceCartPayload`

```ts
{
  schema: 'eko.commerce.cart/1'
  sessionId: string
  documentId: string
  masterId: string
  product: CommerceProductContext
  documentJson: string
  preview: ProductionPreviewRef
  savedAt: string
  summary: { documentName; elementCount; pageCount }
}
```

### `CommerceOrderPayload`

```ts
{
  schema: 'eko.commerce.order/1'
  orderId: string
  lineItemId?: string
  cart: CommerceCartPayload
  recoveredAt?: string
  allowAdminReedit: boolean
}
```

### `CommerceProductContext`

Campos principais: `productId`, `templateId`, opcionais `sku`, `variationId`, `attributes`, `quantity`, `productName`, `currency`, `unitPrice`, `locale`, `hostMeta`.

### `ProductionPreviewRef`

`format`, `mimeType`, `data`, `widthPx`, `heightPx`, `generatedAt`, `fidelity: 'domain' | 'raster'`.

---

## `EditorSessionApi` (resumo)

Métodos frequentes: `bootstrap`, `dispatch`, `undo`/`redo`, `zoomIn`/`zoomOut`, `fitViewport`/`fitWorkspace`, seleção, `createObject`, clipboard, pages, grid/guides, `saveLocalDownload`, `saveToProvider`, `importJson`/`exportJson`, `notify`, `requestConfirm`, `preview`.

Documentação detalhada linha-a-linha: ver `src/sdk/session/EditorSession.ts`.

---

## Erros globais comuns

| Mensagem | Causa |
|----------|-------|
| `EkoPrintStudio: instance destroyed` | Uso após `destroy()` |
| `DocumentProvider required for personalization sessions` | Commerce sem provider |
| `… no DocumentProvider or PersistenceProvider` | `load`/`save` sem backend |
| `format "png" requires ExportProvider` | Export raster/PDF sem provider |

---

## Boas práticas

1. Um `EkoPrintStudio` por embed ativo; `destroy` ao desmontar
2. Não importar `@/core` nos adapters
3. Versionar qualquer fork do schema commerce
4. Em produção, `targetOrigin` explícito no postMessage
5. Tratar preview `domain` como referência — não como arquivo de gráfica

---

## Checklist

### O que deve funcionar

- [ ] Todos os métodos acima typecheck com o projeto
- [ ] Exemplos de getting-started compilam no monorepo

### Como validar

- [ ] `npx tsc --noEmit`
- [ ] `npm test -- tests/commerce`

### Erros mais comuns

- Assumir API npm publicada
- Assumir PNG automático sem ExportProvider
