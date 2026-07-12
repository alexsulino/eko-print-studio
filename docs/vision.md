# Visão — Eko Print Studio

## O que é

**Eko Print Studio não é apenas um editor.**

**É uma plataforma Web-to-Print** para criação, personalização e preparação de artes para produção gráfica.

Não é um editor de imagens genérico. É um sistema orientado a documento, regras de negócio e fluxo de produção.

## O que não é

- Não é um clone de editores fotográficos ou de design livre.
- Não é um produto cujo nome depende do motor gráfico.
- Konva (ou qualquer outro renderer) é implementação interna — não identidade.

## Papel do editor visual

O editor visual é **apenas um dos módulos**. Ele permite manipular uma Session Design derivada de um Template Master, respeitando regras, assets permitidos e permissões.

O valor do produto está no conjunto:

- documento canônico (`EkoDocument`)
- templates mestres
- sessões de personalização
- regras e proteção de marca
- assets controlados
- preparação para produção
- integrações (WooCommerce, Shopify, APIs, sistemas próprios)

## Princípios

1. **Documento primeiro** — o JSON (`EkoDocument`) é a fonte de verdade; a UI renderiza e edita o documento.
2. **Template → Session → Production → Print Pipeline** — o fluxo de vida da arte é explícito e previsível.
3. **Regras antes da mutação** — o Rules Engine decide o que pode ser feito.
4. **Providers substituíveis** — o core não depende de WordPress, WooCommerce ou storage específico.
5. **Produção gráfica** — bleed, safe area, DPI e modo de cor fazem parte do modelo; a saída é responsabilidade do Print Pipeline.

## Público e uso

Lojas e sistemas que vendem produtos personalizados precisam de:

- templates controlados pela marca
- personalização segura pelo cliente ou operador
- saída confiável para impressão / produção

Eko Print Studio existe para preencher esse espaço de ponta a ponta, começando pelo Foundation (v0.1.0) e evoluindo até Production Engine e Plugin SDK.
