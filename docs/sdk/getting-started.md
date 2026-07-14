# SDK — Getting Started

## O que é o SDK?

O **SDK** é a API pública TypeScript para embutir o Eko Print Studio em um host (app React, adapter de loja, iframe shell).

A classe principal é `EkoPrintStudio`.

## Por que existe?

Hosts **não** devem importar `@/core`. Toda operação de produto passa pelo SDK + tipos públicos (`@/types`).

## Quando utilizar?

- Integrar commerce (`openPersonalization`, finalize, preview)
- Embarcar o Creator numa SPA própria
- Escutar eventos de plataforma
- Registrar plugins/objetos/renderers

> **Atenção:** o pacote npm ainda é **privado** (`private: true`). Hoje você consome o SDK **dentro deste monorepo** (`@/sdk`). Publicação npm = **pendente**.

---

## Pré-requisitos

1. Repositório clonado e `npm install`
2. TypeScript + React 19 (como no app oficial)
3. Para commerce: um `DocumentProvider` capaz de criar sessão a partir de `templateId`

---

## Inicializar

```ts
import { EkoPrintStudio, platformEvents } from '@/sdk'

const editor = new EkoPrintStudio({
  documentProvider: myDocumentProvider, // obrigatório para personalização
  providers: {
    // persistence?: PersistenceProvider
    // export?: ExportProvider
  },
  // host?: HostBridge custom
  // sessionStore?: PersonalizationSessionStore
})
```

**Resultado esperado:** instância viva; `editor.getDocument()` pode ser `null` até `load` / `open` / `bootstrap` / `openPersonalization`.

---

## Abrir um documento (sem commerce)

### Opção A — objeto já em memória

```ts
editor.open(document)
```

### Opção B — por id (provider / persistence)

```ts
await editor.load('doc_123')
```

### Opção C — bootstrap do Creator (template master)

```ts
await editor.bootstrap('template_caneca-brasil')
```

**Resultado esperado:** `editor.getDocument()` preenchido; evento `document.opened`.

---

## Abrir sessão de personalização (commerce)

```ts
import type { CommerceProductContext } from '@/sdk'

const product: CommerceProductContext = {
  productId: '42',
  templateId: 'template_caneca-brasil',
  productName: 'Caneca Brasil',
  quantity: 1,
  currency: 'BRL',
  unitPrice: 59.9,
  locale: 'pt-BR',
}

const session = await editor.openPersonalization({
  product,
  embedMode: 'modal',
  autosaveMs: 15000, // 0 desliga autosave
})

console.log(session.id, session.status)
```

**Resultado esperado:** `PersonalizationSessionRecord` com `status` ativo/iniciado; documento de sessão no editor.

### Retomar sessão

```ts
await editor.resumePersonalization(sessionId)
// ou
await editor.openPersonalization({ sessionId, product, embedMode: 'page' })
```

---

## Salvar e finalizar

```ts
// Salva sessão + monta cart payload (sem necessariamente notificar host)
const saved = await editor.savePersonalization()
console.log(saved.cart.schema) // 'eko.commerce.cart/1'

// Finaliza e emite personalization:finalized no host
const finalized = await editor.finalizePersonalization()
```

**Quando usar cada um?**

| Método | Quando |
|--------|--------|
| `savePersonalization` | Rascunho / “Salvar e continuar” |
| `finalizePersonalization` | Cliente concluiu e host deve ir ao carrinho |

```ts
await editor.cancelPersonalization()
```

---

## Preview de produção

```ts
const preview = await editor.generateProductionPreview()
// preview.fidelity === 'domain' | 'raster'
// raster requer ExportProvider configurado
```

---

## Eventos

```ts
const off = editor.on(platformEvents.DocumentSaved, (payload) => {
  console.log('saved', payload)
})

editor.on(platformEvents.CartPayloadReady, (payload) => {
  // host commerce
})

// depois…
off()
// ou editor.off(event, handler)
```

---

## Sessão Creator (UI)

```ts
const session = editor.session()
session.undo()
session.redo()
session.zoomIn()
session.createObject('text')
session.notify({ message: 'Pronto', tone: 'success' })
```

No React do Creator oficial:

```tsx
import { EditorProvider, useEditor, useEditorSnapshot } from '@/sdk'

function Shell() {
  const editor = useEditor()
  const snap = useEditorSnapshot()
  return <div>{snap.document?.name}</div>
}

export function App() {
  const editor = new EkoPrintStudio({ /* … */ })
  return (
    <EditorProvider editor={editor}>
      <Shell />
    </EditorProvider>
  )
}
```

---

## Exemplo mínimo ponta a ponta (pseudocódigo host)

```ts
const editor = new EkoPrintStudio({ documentProvider })

await editor.openPersonalization({
  product: { productId: '1', templateId: 'template_caneca-brasil' },
  embedMode: 'iframe',
})

// usuário edita via UI…

const { cart } = await editor.finalizePersonalization()

// host mapeia cart → Woo / Shopify / API própria
await fetch('/api/cart', {
  method: 'POST',
  body: JSON.stringify(cart),
})

editor.destroy()
```

---

## Checklist

### O que deve funcionar

- [ ] `new EkoPrintStudio` + `bootstrap` ou `openPersonalization`
- [ ] `save` / `savePersonalization` sem throw
- [ ] `on(platformEvents.*)` recebe eventos
- [ ] `destroy()` impede novas calls (`instance destroyed`)

### Como validar

- [ ] `npm test` (inclui testes de commerce)
- [ ] Log de `cart.schema === 'eko.commerce.cart/1'`

### Erros mais comuns

- Commerce sem `DocumentProvider`
- `export('png')` sem `ExportProvider`
- Usar instância após `destroy()`

→ API completa em [public-api.md](./public-api.md)
