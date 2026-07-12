# Eko Print Studio

Engine profissional para personalização gráfica e Web-to-Print.

**Eko Print Studio** é uma plataforma para criação, personalização e preparação de artes para produção gráfica. O editor visual é um dos módulos — não o produto inteiro.

**Foundation Release:** `v0.1.0` — ver [`VERSION.md`](VERSION.md) e [`CHANGELOG.md`](CHANGELOG.md).

O **EkoDocument JSON** é a fonte de verdade. Konva é apenas a tecnologia interna de renderização e manipulação no canvas.

## Architectural Principles

1. EkoDocument é a única fonte de verdade.
2. Konva é apenas o renderer visual.
3. Template Master nunca é editado pelo cliente.
4. Toda personalização ocorre em Session Documents.
5. Persistência nunca depende do canvas.
6. Toda renderização deriva do documento.
7. Toda mutação passa obrigatoriamente pelo Rules Engine.
8. Integrações externas utilizam Providers.
9. O núcleo permanece independente de qualquer plataforma.
10. Produção gráfica será responsabilidade do Print Pipeline.

## Objetivos

| Módulo | Papel |
|--------|--------|
| **Editor visual** | Edição interativa de sessões a partir de templates |
| **Template Engine** | Template Master como arte mestre bloqueável |
| **Rules Engine** | Permissões, constraints e proteção de marca |
| **Asset Registry** | Fontes, imagens e fundos permitidos |
| **Produção gráfica** | Metadados de bleed, safe area e modo de cor |
| **WooCommerce** | Integração com pedidos e produtos |
| **APIs** | Providers para sistemas externos |
| **Shopify** | Integração com lojas Shopify |
| **Sistemas próprios** | Provider Pattern para backends customizados |

## Fase atual (Foundation)

- Schema `EkoDocument` (`schemaVersion` semântico)
- Elementos com `category`, `slug` e constraints
- `variables` e `permissions` no documento
- Template Master → Session Design (`createSession`)
- Canvas (texto, imagem, shape)
- Seleção / move / resize
- `TemplateRulesEngine`, `ObjectRegistry`, `ViewportManager`
- `HistoryEngine` (Command Pattern — estrutura pronta)
- `LocalDocumentProvider`
- Export / import JSON limpo
- Testes de serialização, validação e regras

## Fluxo

```text
Template Master
  → Session Design
  → Production Document
  → Print Pipeline
```

## Roadmap (resumo)

1. **Foundation**
2. **Document Engine**
3. **Layers**
4. **Property Engine**
5. **Assets**
6. **Typography**
7. **Variables**
8. **WooCommerce Adapter**
9. **Production Engine**
10. **Plugin SDK**

Detalhes em [`docs/roadmap.md`](docs/roadmap.md). Visão do produto em [`docs/vision.md`](docs/vision.md). Arquitetura em [`docs/architecture.md`](docs/architecture.md).

## Scripts

```bash
npm install
npm run dev
npm test
npm run build
```

## Arquitetura

Ver pastas em `src/core`, `src/providers`, `src/store`, `src/types` e a documentação em `docs/`.

Repositório: [github.com/alexsulino/eko-print-studio](https://github.com/alexsulino/eko-print-studio)
