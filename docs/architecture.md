# Arquitetura — Eko Print Studio

Visão estrutural do core. A identidade do produto é **Eko Print Studio**; o motor de canvas (Konva) é detalhe de implementação na camada de UI.

Foundation Release: **v0.1.0**.

## Princípio central

```text
EkoDocument (JSON)  =  fonte de verdade
UI / canvas         =  projeção e manipulação
Providers           =  I/O e integrações
```

Mutações passam por comandos e pelo Rules Engine. Runtime de renderização (nós do canvas) não entra no JSON exportado.

---

## Fluxo oficial

```text
Template Master
      ↓
Session Design
      ↓
Production Document
      ↓
Print Pipeline
```

## Document Layout Model (v0.3.0)

```text
EkoDocument
  ├── pages[]        (folder, calendário, livro)
  ├── surfaces[]     (frente / verso / faces do produto)
  ├── regions[]      (printable, safe, bleed, margin, custom)
  ├── elements[]     (coleção plana canônica para edição)
  └── guides[]       (apenas edição — removidos na produção)
```

Pipeline de projeção:

```text
EkoDocument → Layout Resolver → Renderer Adapter → Konva
```

Coordenadas de domínio (`CoordinateSystem`) isolam document / viewport / region. Konva nunca escreve no documento.

| Etapa | Status (v0.3.0) |
|-------|-----------------|
| Template Master | Implementado |
| Session Design (`createSession` / `cloneToSession`) | Implementado |
| Production Document (`type: 'production'` + meta) | Presente no schema |
| Print Pipeline | Roadmap (Production Engine) |

---

## EkoDocument

Modelo canônico em `src/types/document.ts`.

Campos principais: `id`, `type` (`template` | `session` | `production`), `schemaVersion`, `metadata`, `canvas`, `rules`, `assets`, `permissions`, `variables`, `elements`, `pages` (preparado).

Operações em `src/core/document/`:

- `createDocument` — documento vazio
- `validateDocument` — validação estrutural
- `serializeDocument` / `exportDocument` / `importDocument` — persistência limpa
- `cloneToSession` — Template Master → Session Design
- `units` — conversão física (mm/cm) ↔ pixels via DPI

---

## Template Master

Documento `type: 'template'`, tipicamente com `permissions.lockMaster` e edição restrita.

Define a arte mestre do produto: layout, elementos por categoria, constraints, fontes/fundos permitidos e metadados de produção (`bleedMm`, `safeAreaMm`, `colorMode`).

O master **nunca é editado pelo cliente**.

---

## Session Design

Clone editável criado via `DocumentProvider.createSession(masterId)` → `cloneToSession`.

Recebe novo `id`, `type: 'session'`, `metadata.masterId` e permissões abertas para edição/salvamento. Toda personalização ocorre em Session Documents.

---

## Production Document

Documento `type: 'production'`. No Foundation, o tipo e os metadados de produção existem no schema; a transição Session → Production Document é responsabilidade do Production Engine (roadmap).

---

## Print Pipeline

Responsável pela saída para produção gráfica (validação pré-impressão, artefatos, exportações). Fora do escopo do Foundation; o núcleo permanece independente do pipeline.

---

## Rules Engine

`TemplateRulesEngine` em `src/core/rules/`.

Consultado antes das mutações (`applyCommand`). Avalia:

- master bloqueado
- permissões do documento
- elemento locked / editable
- proteção de marca
- constraints por ação (`move`, `resize`, `changeText`, …)
- fontes e fundos permitidos

Toda mutação passa obrigatoriamente pelo Rules Engine.

---

## Object Registry

`ObjectRegistry` + `registerBuiltins` em `src/core/registry/`.

Registro extensível de tipos de elemento (`text`, `image`, `shape`, stubs futuros). Isola definição de tipos do renderer.

`AssetRegistry` lê pools de assets do documento e valida fontes/fundos permitidos.

---

## Viewport

`ViewportManager` em `src/core/viewport/`.

Zoom, pan, fit e mapeamento tela ↔ documento. Estado no store (`zoom`, `panX`/`panY`, tamanho do stage). Independente do schema do documento.

---

## Provider Pattern

Contrato `DocumentProvider` em `src/types/provider.ts`:

- `getDocument` / `saveDocument`
- `createSession`
- `listDocuments` (opcional)

Implementação Foundation: `LocalDocumentProvider` (memória + `localStorage`, chave `eko-print-studio-documents`).

Integrações externas utilizam Providers. O núcleo permanece independente de qualquer plataforma.

---

## Camadas do código

```text
src/
  types/       contratos (documento, elemento, rules, provider, viewport)
  core/        document, rules, registry, viewport, editor/commands, history
  providers/   I/O (LocalDocumentProvider; futuros adapters)
  store/       estado da sessão de edição (Zustand)
  services/    fachadas finas sobre core/providers
  components/  UI — Toolbar, Canvas (renderer), PropertiesPanel
  data/        templates de demonstração
```

Persistência nunca depende do canvas. Toda renderização deriva do documento. Nomes internos ligados à biblioteca de canvas permanecem como detalhe de implementação — não como marca do produto.

---

## Stability Layer (v0.5.1)

Camada de qualidade antes da Asset Engine — **sem alterar o core de domínio**:

| Componente | Local | Papel |
|------------|-------|--------|
| Error Boundary | `components/ErrorBoundary` | Isola falhas de renderização do canvas; documento permanece no store |
| Eko Diagnostics | `components/Diagnostics` + `diagnostics/` | Painel dev-only (`Ctrl+Shift+D`); métricas de renderer e health |
| Document Health | `core/document/DocumentHealth` | Auditoria read-only (`valid`, `errors`, `warnings`) |

Regras de isolamento (auditadas):

- `src/core/` **não** importa React, Konva ou adapters de plataforma
- Renderer (`components/CanvasEditor`) conhece Konva
- Providers/adapters conhecem I/O externo

Pipeline oficial inalterado:

```text
EkoDocument → Layout Resolver → Renderer Adapter → Konva Canvas
```

---

## Asset Library Experience (Editor UX)

Conecta o Asset Engine à UX sem upload e sem estado paralelo de assets:

```text
AssetLibrary → InsertAsset → Create Element → History → EkoDocument → Renderer
```

| Peça | Local | Papel |
|------|-------|--------|
| Projeção da biblioteca | `core/assets/libraryAssets` | Lista insertável derivada de `document.assets` |
| Factory | `core/assets/createElementFromAsset` | Asset payload → `EkoElement` (puro) |
| Comando | `InsertAsset` | Mutation única via history; surface ativa |
| UI | `editor/assets/*` | `AssetLibrary` / `AssetGrid` / `AssetCard` |

Elementos de imagem referenciam o asset via `properties.assetId` (+ `src` de fallback). Placeholders de template viram `shape` com `metadata.role = template-placeholder`. Upload, DnD no canvas, busca, categorias e favoritos ficam preparados na UI, ainda não implementados.
