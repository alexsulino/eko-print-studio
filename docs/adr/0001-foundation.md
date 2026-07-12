# ADR-0001 — Foundation Decisions

**Status:** Accepted  
**Date:** 2026-07-12  
**Release:** v0.1.0 (Foundation)

## Context

O projeto nasce como uma plataforma Web-to-Print — não como um editor de imagens genérico.

A fundação precisa isolar o núcleo (documento, regras, providers) de qualquer renderer visual e de qualquer plataforma de integração, para que evoluções futuras não forcem mudanças no Core.

## Decisions

1. **EkoDocument** é a única fonte de verdade.
2. **Konva** é somente o renderer visual.
3. **Template Masters** nunca são editados pelo cliente.
4. Toda edição ocorre em **Session Documents**.
5. **Persistência** é independente do renderer.
6. **Providers** isolam integrações externas.
7. **WooCommerce** nunca fará parte do Core.
8. O **Print Pipeline** será responsável pela produção gráfica.
9. Toda **renderização** deriva do documento.
10. Toda **mutação** obrigatoriamente passa pelo Rules Engine.

## Consequences

Essas decisões permitem evoluir para WooCommerce, Shopify, APIs, Desktop e outros sistemas **sem alterar o Core**:

- Novos canais entram como **Providers** / adapters, não como acoplamento no schema ou no Rules Engine.
- Trocar ou complementar o renderer (Konva ou outro) não muda o `EkoDocument` nem a persistência.
- Template → Session → Production Document → Print Pipeline permanece o fluxo estável; fases futuras (Property Engine, Production Engine, Plugin SDK) estendem o núcleo, não o reescrevem.
- O produto permanece uma plataforma Web-to-Print, com o editor visual como módulo — não como identidade.

## Related

- [`docs/architecture.md`](../architecture.md)
- [`docs/vision.md`](../vision.md)
- [`VERSION.md`](../../VERSION.md)
