# Roadmap — Eko Print Studio

Fases planejadas do produto. A ordem reflete dependências técnicas e valor de negócio.

## Foundation

Base do produto: schema `EkoDocument`, canvas editável, Template Master → Session Design, Rules Engine, Object/Asset Registry, Viewport, History (estrutura), LocalDocumentProvider, export/import JSON e testes.

**Status:** entregue em **v0.1.0** (Foundation Release).

## Interaction Engine

Infraestrutura de interação: Selection, Keyboard, Clipboard, Transformer, Snapping, Viewport gestures, Alignment Guides e separação de estados.

**Status:** entregue em **v0.2.0**. **Fase 2.1 (Professional Interaction / UX Refinement)** em andamento sob Unreleased — Smart Guides, snap com prioridade, multi-transform, hover, zoom suave, align/distribute, clipboard profissional e polish visual Canva-like.

## Document Engine

Ciclo de vida completo do documento e **Document Layout Model**: Pages, Surfaces, Regions, Coordinate System, Layout Resolver, Renderer Adapter, Event Bus, Anchors e Element Lifecycle (estrutura).

**Status:** entregue em **v0.3.0** (Document & Layout Engine). Schema `1.1.0`.

**Document & Workspace Engine (Unreleased):** evolução da v0.3.0 — `WorkspaceEngine` (infinite canvas), `UnitsEngine` (mm/cm/px/in/pt), `RulerEngine`, `GridEngine`, `LayoutEngine` bounds, `PageEngine` delete/reorder, coordinates document↔workspace↔viewport↔screen. Prepara multi-página em escala sem refatorar Interaction/Viewport.

## Layers

**Document Graph & Layer Engine**: árvore documental, ownership, z-order, grupos, hierarquia de lock/visibility, Layer Panel.

**Status:** entregue em **v0.4.0**.

**Object System (Unreleased):** unificação Canva-like — contrato base compartilhado, ObjectRegistry com capabilities/factories, PropertyEngine (patch/merge/migrate), Style/Constraint/Naming/HitTest engines, grupos com propagação de transform. Novos tipos registram-se sem alterar o core.

## Property Engine

**Property & Attribute Engine**: schemas tipados, grupos (Transform / Appearance / Typography / Content), `UpdateProperty` command, PropertiesPanel baseado em descriptors do domínio, Rules bloqueando updates proibidos.

**Status:** entregue em **v0.5.0**. Evoluído sob Object System Unreleased (`patch` / `mergeDefaults` / `migrateElement`).

## Stability Layer

**Quality Hardening** antes da Asset Engine: Error Boundary no canvas, Diagnostics dev-only (`Ctrl+Shift+D`), `DocumentHealth` (auditoria read-only), estabilização do renderer (CSS/Stage) e testes de qualidade.

**Status:** entregue em **v0.5.1**.

## Rendering & Platform Engine

**v0.6.0 (Unreleased):** pipeline de renderização desacoplado + preparação SDK/plataforma.

- `core/render` — RenderPipeline, RendererRegistry, RenderContext, passes, cache, layers, OverlaySystem
- `core/platform` — contratos de providers (Storage / Asset / Font / Upload / Export / Clipboard / i18n / Theme / Config / Persistence)
- `core/host` — MessageBus / RPC / Callbacks (sem APIs de browser no Core)
- `core/plugins` — PluginRegistry
- `sdk/EkoPrintStudio` — fachada pública (`load` / `open` / `save` / `export` / `on` / `off` / `register` / `destroy`)
- `adapters/konva/KonvaAdapter` — backend de paint fora do Core

Canvas React/Konva permanece a projeção atual; a migração gradual do Stage para o adapter não quebra Interaction / Workspace / Object System.

Integrações WooCommerce / Shopify / Magento / Nuvemshop / Tray / React / Vue / Angular / iframe **não** modificam o Core — apenas adaptadores que consomem a API pública.

## Creator Experience & Design System

**v0.7.0 (Unreleased):** MVP comercial do editor — UI Canva-like sobre o SDK.

- `src/ui` — Design System + ThemeEngine (light/dark/canva) + component library
- `sdk/session` + `EditorProvider` — fronteira obrigatória UI → SDK (Commands / Events / Session)
- Top Bar / Left Sidebar expansível / Inspector contextual / Floating Toolbar / Context Menu / Toasts
- Fluxo: abrir template → editar conteúdo → preview → salvar → entregar ao host

Canvas Konva continua como adaptador de renderização; painéis Creator não importam `@/core`.

## Commerce Integration & Production MVP

**v0.8.0 (Unreleased):** primeiro adaptador oficial de loja + sessão de personalização.

```text
Produto Woo → WooCommerceAdapter.openEditor
  → SDK openPersonalization (clone master → session)
  → editar / preview
  → finalizeCustomization → CommerceCartPayload
  → meta eko_personalization no carrinho
  → CommerceOrderPayload no pedido
  → admin reopenFromOrder
```

- Contratos em `types/commerce` (reutilizáveis por Shopify/Magento/…)
- `PersonalizationSessionManager` + LocalPersistenceProvider
- Preview de produção (domínio) em `sdk/preview`
- `adapters/woocommerce` não importa Core

## WooCommerce Production Plugin

**v0.8.1 (Unreleased):** plugin WordPress instalável em `integrations/woocommerce/eko-print-studio/`.

Lojista: ativa plugin → configura URL do editor → seleciona Template Master no produto → vende.

Cliente: Personalizar → editor (SDK) → Save/finalize → carrinho → pedido → admin reabre sessão.

O plugin PHP/JS é apenas adaptador comercial (REST, meta, UI de botão/painel). Nenhuma lógica de edição.

## Assets

Registro robusto de fontes, imagens e fundos; resolução de URLs; fontes permitidas; integração com mídia externa (CDN, WP Media, API).

## Typography

Tipografia orientada a produção: famílias permitidas, métricas, preview fiel e preparação para saída de impressão.

## Variables

Variáveis dinâmicas (`DocumentVariables`) resolvidas a partir de pedido, cliente, produto ou sistema — preview e binding no documento.

## WooCommerce Adapter

**Status (v0.8.0 Unreleased):** adaptador oficial entregue em `adapters/woocommerce`.

Fluxo: produto → editor (modal/iframe/page) → personalização → `CommerceCartPayload` → carrinho → `CommerceOrderPayload` → pedido → reabertura admin.

Shopify / Magento / Nuvemshop / Tray reutilizam os mesmos contratos em `types/commerce` — apenas novos adapters.

## Production Engine

Transição Session Design → Production Document, metadados de produção (bleed, safe area, color mode) e Print Pipeline (saída para produção gráfica).

## Plugin SDK

Extensibilidade oficial: novos tipos de elemento via Object Registry, providers customizados e ganchos para sistemas próprios (incluindo Shopify e APIs externas como consumidores do mesmo núcleo).
