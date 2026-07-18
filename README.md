# Eko Print Studio

Engine profissional para personalização gráfica e Web-to-Print.

**Eko Print Studio** é uma plataforma para criação, personalização e preparação de artes para produção gráfica. O editor visual é um dos módulos — não o produto inteiro.

**Foundation:** `v0.1.0` · **Interaction:** `v0.2.0` · **Layout:** `v0.3.0` · **Graph/Layers:** `v0.4.0` · **Properties:** `v0.5.0` — ver [`VERSION.md`](VERSION.md).

O **EkoDocument JSON** é a fonte de verdade. Konva é apenas a tecnologia interna de renderização e manipulação no canvas.

## Princípios Fundamentais

A constituição do projeto — **prioridade máxima na arquitetura**:

→ **[`docs/architecture/ARCHITECTURE_STATUS.md`](docs/architecture/ARCHITECTURE_STATUS.md)** · **[`docs/architecture/invariants.md`](docs/architecture/invariants.md)** · **[`docs/architecture/STABILITY.md`](docs/architecture/STABILITY.md)** (**Nível 4**)

Invariantes e garantias definem o que **nunca** pode ser quebrado. Fitness Functions + `npm run architecture:verify` detectam regressões estruturais na CI.

Fluxo oficial imutável (ADR-0004): `Editor → Save → Woo Persistence → CPT → Cart → Resume → Re-edit → Order`.

Governança: [`RELEASE_POLICY`](docs/architecture/RELEASE_POLICY.md) · [`QUALITY_PIPELINE`](docs/architecture/QUALITY_PIPELINE.md) · [`LESSONS_LEARNED`](docs/architecture/LESSONS_LEARNED.md).

Contribuição e checklist de PR: [`CONTRIBUTING.md`](CONTRIBUTING.md) · [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md).

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
11. JSON em post/order meta no WordPress **só** via `JsonMetaPersistence` (INV-1 / ADR-0002).
12. Intent commerce nunca cai em standalone silencioso (INV-9).
13. Fluxo oficial commerce é imutável sem ADR (INV-12).
14. Sem instrumentação TEMP em paths críticos (INV-11).

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

1. **Foundation** (v0.1.0)
2. **Interaction Engine** (v0.2.0)
3. **Document & Layout Engine** (v0.3.0)
4. **Document Graph & Layer Engine** (v0.4.0)
5. **Property & Attribute Engine** (v0.5.0)
6. **Assets**
7. **Typography**
8. **Variables**
9. **WooCommerce Adapter**
10. **Production Engine**
11. **Plugin SDK**

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
