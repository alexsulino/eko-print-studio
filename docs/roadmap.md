# Roadmap — Eko Print Studio

Fases planejadas do produto. A ordem reflete dependências técnicas e valor de negócio.

## Foundation

Base do produto: schema `EkoDocument`, canvas editável, Template Master → Session Design, Rules Engine, Object/Asset Registry, Viewport, History (estrutura), LocalDocumentProvider, export/import JSON e testes.

**Status:** entregue em **v0.1.0** (Foundation Release).

## Document Engine

Ciclo de vida completo do documento: criação, validação, serialização, versionamento semântico do schema, páginas múltiplas e operações de persistência consistentes via Provider.

## Layers

Modelo e UX de camadas: ordenação, agrupamento, visibilidade/bloqueio, hierarquia alinhada ao Object Registry.

## Property Engine

Motor de propriedades e edição tipada: painéis, constraints de propriedade, binding com Rules Engine e Object Registry.

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
