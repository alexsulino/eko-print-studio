# Eko Print Studio — Documentação Oficial

Bem-vindo. Esta é a documentação oficial do **Eko Print Studio**, a plataforma Web-to-Print para personalização de produtos em e-commerce.

Se você nunca viu o projeto, comece por [01 — Introdução](./01-introduction.md).

---

## Para quem é esta documentação?

| Perfil | Comece em |
|--------|-----------|
| Desenvolvedor Frontend (React / Vite) | [02 — Desenvolvimento local](./02-local-development.md) |
| Integrador WooCommerce | [03 — Plugin WooCommerce](./03-woocommerce-plugin.md) |
| DevOps / publicação | [04 — Produção](./04-production.md) |
| Consumidor do SDK | [SDK · Getting Started](./sdk/getting-started.md) |
| Quem está com erro agora | [05 — Troubleshooting](./05-troubleshooting.md) |

---

## Índice completo

### Guias principais

1. [Introdução](./01-introduction.md) — o que é, por que existe, visão geral
2. [Desenvolvimento local](./02-local-development.md) — Node, Vite, WordPress, WooCommerce
3. [Plugin WooCommerce](./03-woocommerce-plugin.md) — instalação até pedido no admin
4. [Produção](./04-production.md) — build, hospedagem, atualização
5. [Troubleshooting](./05-troubleshooting.md) — sintomas → causas → soluções
6. [Arquitetura](./06-architecture.md) — Core, SDK, Adapters, Plugin (visão de produto)

### SDK

- [Getting Started](./sdk/getting-started.md)
- [Public API](./sdk/public-api.md)

### Adapters / CommerceProvider

- [WooCommerce (`WooCommerceCommerceProvider`)](./adapters/woocommerce.md)
- Stubs preparados: Shopify · Magento · Nuvemshop (`src/providers/commerce/stubs/`)

### Exemplos ponta a ponta

- [Local](./examples/local.md)
- [Produção](./examples/production.md)

### Histórico e visão (internos do repositório)

- [Visão do produto](./vision.md)
- [Arquitetura técnica (legado)](./architecture.md)
- [Roadmap](./roadmap.md)
- [ADR Foundation](./adr/0001-foundation.md)
- [Architectural Invariants (constituição)](./architecture/invariants.md)
- [System Guarantees](./architecture/SYSTEM_GUARANTEES.md)
- [ADR-0002 WordPress JSON meta persistence](./architecture/ADR-0002-wordpress-json-persistence.md)
- [CONTRIBUTING](../CONTRIBUTING.md)

---

## Versão documentada

| Componente | Versão / status |
|------------|-----------------|
| Pacote npm (`package.json`) | `0.5.0` (repositório privado) |
| Commerce + SDK session | Unreleased v0.8.0 |
| Plugin WooCommerce | Unreleased v0.8.1 |
| Template de demonstração | `template_caneca-brasil` |

> **Nota:** o CHANGELOG usa seções *Unreleased* para fases v0.6–v0.8.1. Esta documentação descreve o comportamento **implementado no código** nessas fases.

---

## Convenções

| Bloco | Significado |
|-------|-------------|
| > **Dica** | Atalho ou boa prática |
| > **Atenção** | Risco comum |
| > **Pendente de implementação** | Ainda não existe no código |
| > **A confirmar** | Depende do ambiente do lojista |

Comandos usam **npm** (gerenciador do repositório). Yarn funciona de forma equivalente se preferir.

---

## Lacunas conhecidas (produto)

Documentadas honestamente nos guias; resumo:

| Lacuna | Onde aparece |
|--------|--------------|
| Pacote npm público (`private: true`) | SDK / instalação |
| Docker Compose oficial WP+Editor | Local / exemplos |
| Thumbnail raster automático no carrinho | Requer `ExportProvider` |
| Pipeline PDF/CMYK de gráfica | Produção futura |
| Adapters Shopify / Magento | Arquitetura / roadmap |
| Capturas reais (Screenshots 01–07) | `docs/assets/screenshots/` |
| Empacotamento `.zip` no WordPress.org | Produção / updates |

Se algo ainda não estiver implementado, os docs marcam **Pendente de implementação** ou **A confirmar** — não inventam comportamento.
