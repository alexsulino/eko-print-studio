# Roadmap — Eko Print Studio

Fases planejadas do produto. A ordem reflete dependências técnicas e valor de negócio.

## Foundation

Base do produto: schema `EkoDocument`, canvas editável, Template Master → Session Design, Rules Engine, Object/Asset Registry, Viewport, History (estrutura), LocalDocumentProvider, export/import JSON e testes.

**Status:** entregue em **v0.1.0** (Foundation Release).

## Interaction Engine

Infraestrutura de interação: Selection, Keyboard, Clipboard, Transformer, Snapping, Viewport gestures, Alignment Guides e separação de estados.

**Status:** entregue em **v0.2.0**.

## Document Engine

Ciclo de vida completo do documento e **Document Layout Model**: Pages, Surfaces, Regions, Coordinate System, Layout Resolver, Renderer Adapter, Event Bus, Anchors e Element Lifecycle (estrutura).

**Status:** entregue em **v0.3.0** (Document & Layout Engine). Schema `1.1.0`.

## Layers

**Document Graph & Layer Engine**: árvore documental, ownership, z-order, grupos, hierarquia de lock/visibility, Layer Panel.

**Status:** entregue em **v0.4.0**.

## Property Engine

**Property & Attribute Engine**: schemas tipados, grupos (Transform / Appearance / Typography / Content), `UpdateProperty` command, PropertiesPanel baseado em descriptors do domínio, Rules bloqueando updates proibidos.

**Status:** entregue em **v0.5.0**.

## Assets

Registro robusto de fontes, imagens e fundos; resolução de URLs; fontes permitidas; integração com mídia externa (CDN, WP Media, API).

## Typography

Tipografia orientada a produção: famílias permitidas, métricas, preview fiel e preparação para saída de impressão.

## Variables

Variáveis dinâmicas (`DocumentVariables`) resolvidas a partir de pedido, cliente, produto ou sistema — preview e binding no documento.

## WooCommerce Adapter

Adapter Provider para produtos e pedidos WooCommerce: carregar master, abrir session, devolver arte/metadados para o pedido.

## Production Engine

Transição Session Design → Production Document, metadados de produção (bleed, safe area, color mode) e Print Pipeline (saída para produção gráfica).

## Plugin SDK

Extensibilidade oficial: novos tipos de elemento via Object Registry, providers customizados e ganchos para sistemas próprios (incluindo Shopify e APIs externas como consumidores do mesmo núcleo).
