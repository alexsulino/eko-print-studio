# Changelog

All notable changes to Eko Print Studio are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/), and this project uses [Semantic Versioning](https://semver.org/).

## [Unreleased] — Functional stabilization patches (cart/order edit)

### Fixed

- `product_context`: explicit customization hint no longer falls back to `for_product` (wrong cart line)
- `host-bridge` cart Edit: resume only if resolved id matches button hint (else GET by id / fail)
- Admin order: same `data-eko-edit-customization` + `data-product-id` as cart; `admin-reopen` uses `startFromCartEdit` + `product-context` token

## [Unreleased] — Conservative Woo cart/order reopen fixes (no architecture change)

### Fixed

- `host-bridge.js` SyntaxError left by TEMP-log removal (broken `listenForPayload` / cart-edit click handler) — cart Edit and add-to-cart messaging were dead
- PDP after `cart_attached` no longer forces resume of the first product customization — "Personalizar" starts a **new** Customization (Maria + João as separate cart lines); cart Edit still resumes the line id
- Admin order reopen panel: decode `_eko_commerce_order` when meta is already an array; fallback to scalar metas so **Reabrir Personalização** still renders; `order-payload` REST same resilience
- `admin-reopen.js` now fetches `product-context` and passes `restUrl` + `persistenceToken` (same as cart Edit) so resume loads CPT `documentJson` instead of Local-only

### Not changed

- Save / Resume / Finalize / lifecycle / JsonMetaPersistence / SessionRepository / REST payload schemas / cart unique_key-by-customizationId replace-same-line behavior

## [Unreleased] — Level 4 architecture governance (no behavior change)

### Added

- `docs/architecture/RELEASE_POLICY.md` — release ladder Nível 0 → Produção
- `docs/architecture/QUALITY_PIPELINE.md` — ideal gates vs current scripts (missing scripts documented, not invented)
- `docs/architecture/GOVERNANCE.md` — owners + critical-area coverage matrix
- `docs/architecture/LESSONS_LEARNED.md` — LL-001…LL-012 permanent engineering memory
- `docs/architecture/ARCHITECTURE_STATUS.md` — executive status, audit, maturity ratings
- `docs/architecture/ADR-0004-official-commerce-flow.md` — official commerce flow freeze
- ADR-0003 Phase 7 review answers for L1–L7 (can wait; no quick-fix)

### Changed

- Stability verdict elevated to **Nível 4 — Arquiteturalmente blindado** (governance-blinded; residual risks ADR-managed)
- `FUTURE_IMPROVEMENTS.md` refreshed classifications; completed SEGURO items marked done
- FITNESS-12 requires full Level-4 constitution doc package

## [Unreleased] — Architecture constitution hardening (no behavior change)

### Added

- `docs/architecture/CONTRACTS.md` — explicit immutable contracts (REST, SDK, Host, payloads, lifecycle, IDs)
- `docs/architecture/HISTORICAL_REGRESSIONS.md` — HR-01…HR-19 permanent shields registry
- `docs/architecture/RISK_MATRIX.md` — component risk SIM/NÃO matrix
- `docs/architecture/FUTURE_IMPROVEMENTS.md` — classified backlog (never auto-implement)
- `docs/architecture/STABILITY.md` — stability levels
- `docs/architecture/ADR-0003-known-limitations.md` — L1–L7 documented (token, races, dual-store, coerce)
- Invariants **INV-11** (no TEMP debug), **INV-12** (official flow immutable), **INV-13** (PDP HTML escape)
- FITNESS-11 / FITNESS-12; `tests/architecture/HistoricalRegressions.test.ts`

### Changed

- Removed TEMP `[LOAD]` / `[EDIT]` runtime debug from Composite, Woo persistence provider, and host-bridge
- Host-bridge PDP status escapes user/document text before `innerHTML` (security shield only)
- `architecture:verify` includes Historical Regressions suite

## [Unreleased] — Architecture Fitness Functions

### Added

- `docs/architecture/SYSTEM_GUARANTEES.md` — official platform guarantees (G1–G10)
- `tests/architecture/FitnessFunctions.test.ts` — structural fitness functions (CI auto-audit)
- `tests/architecture/fixtures/rest-contract-fingerprint.json` — frozen REST/lifecycle contract
- `npm run architecture:verify` — quality gate with Architecture Status report
- `.github/workflows/architecture.yml` — PR/push must pass architecture verify

## [Unreleased] — Architectural Invariants constitution

### Added

- `docs/architecture/invariants.md` — permanent constitution (INV-1…INV-10)
- `tests/architecture/ArchitecturalInvariants.test.ts` — CI regression shield
- `.github/PULL_REQUEST_TEMPLATE.md` — INV-10 architectural gate checklist

### Changed

- INV-9 enforced in `App.tsx`: commerce boot failure surfaces explicit error — **no** silent standalone / `.eko.json` fallback
- README / CONTRIBUTING / architecture index point to invariants as highest-priority contract

## [Unreleased] — WordPress JSON meta slash fix (v0.8.11)

### Fixed

- `_eko_session_record` / `_eko_session_document` corrupted on save: `update_post_meta` applies `wp_unslash`, which stripped JSON escapes (`\"`, `\\`) and made `json_decode` fail with "Syntax error" (~44KB records with preview/base64)
- Downstream symptoms: `load_post` → null, upsert persist verification → 500 `eko_persist_failed`, `resume()` / cart re-edit broken despite valid CPT lookup

### Changed

- Official helper `JsonMetaPersistence` is the **only** allowed path for JSON meta writes (post meta + order item meta)
- `SessionRepository` / `OrderPersistence` delegate all JSON persistence to the helper (encode → `wp_slash` → store → re-read / integrity)
- ADR-0002 + CONTRIBUTING rules; regression tests for slash invariant and architectural audit

### Notes

- This is permanent architecture — changing slash policy requires a replacement ADR

## [Unreleased] — Canonical session identity (v0.8.10)

### Fixed

- Divergence `record.id` ≠ `_eko_session_id` that made `product-context` succeed while `GET /sessions/{id}` / `resume()` returned 404
- Commerce boot falling back to standalone (`.eko.json` Save) after a failed `resume` for a real repository Customization

### Changed

- `SessionRepository`: every upsert syncs `_eko_session_id`, `_eko_customization_id`, `_eko_session_record`, `post_title` to the same canonical id
- `find_post_id` / `get` resolve via `_eko_session_id` | `_eko_customization_id` | title; `load_post` / `list_by_product` heal misaligned metas
- `CustomizationResolver` views always emit `sessionId === customizationId` (v1)
- `PUT /sessions/{id}` rejects path/body id mismatch; App commerce gate also reads `customizationId`

### Notes

- Contract restored: `record.id === _eko_session_id === customizationId === sessionId` for product-context, GET, resume, cart

## [Unreleased] — Session persist consistency (v0.8.9)

### Changed

- `SessionRepository::upsert` throws when CPT creation/verification fails; `put_session` returns **500** + audit `session.persist_failed`
- `CompositePersistenceProvider.saveSession` still mirrors to Local on Woo failure (`LOCAL_ONLY`) but **rethrows** — no commercial false positive
- `WooCommercePersistenceProvider.saveSession` requires PUT **200** with matching `record.id` (server verifies CPT; no fragile immediate GET)

### Notes

- Fallback Local remains for offline recovery; only `PERSISTED_REMOTE` counts as commercial persistence success
- Save/finalize cannot complete commercially without remote success → orphan `sessionId` never reaches cart via the happy path
- Customization → Commerce → resume architecture unchanged

## [Unreleased] — Reopen via Customization (v0.8.8)

### Added

- `CustomizationResolver` (Woo) — official lookup by id / product / cart / order item
- REST `GET /customizations/{id}` and `GET /products/{id}/customization`
- Cart/checkout **Editar Personalização** (`data-eko-edit-customization` + `customizationId`)

### Changed

- Reedição no longer treats host `sessionStorage` as source of truth (optional UX cache only)
- `product-context` returns resolved `customization` / ids; empty `sessionId` when none exists
- Host-bridge hydrates PDP from REST; opens editor only after Customization → `sessionId` for `resume()`
- Editor shell + admin reopen forward `customizationId` alongside `sessionId`
- `bootCommerceFromUrl` / `HostCommerceProvider` prefer `customizationId` then `sessionId`

### Notes

- SDK + CommerceProvider contracts preserved; v1 still has `customizationId === sessionId`
- Works after F5, new tab, cart, order, login/logout, and other browsers when Customization persists

## [Unreleased] — CommerceProvider (v0.8.7)

### Added

- Platform contract **CommerceProvider** (alongside Template / Persistence / Export)
- `HostCommerceProvider` base + `bootCommerceFromUrl` / `createCommerceProvider`
- **WooCommerceCommerceProvider** — official Woo implementation (cart/postMessage/REST prepare)
- Stubs: `ShopifyCommerceProvider`, `MagentoCommerceProvider`, `NuvemshopCommerceProvider`
- `EkoPrintStudio.configureCommerce` / `getCommerce`
- Neutral host messages: `commerce.cart.add`, `commerce.editor.close` (Woo still emits `woocommerce.*` aliases)

### Changed

- `App.tsx` boots via `CommerceProvider` only — no `@/adapters/woocommerce` import
- `WooCommerceAdapter` / `bootWooCommerceFromUrl` kept as deprecated façades
- WordPress plugin unchanged in behavior; host-bridge also accepts neutral commerce messages

### Notes

- PersistenceProvider / ExportProvider / Customization lifecycle contracts unchanged
- New storefronts = new CommerceProvider implementation — SDK stays store-agnostic

## [Unreleased] — Customization lifecycle entity (v0.8.6)

### Added

- Business entity **Customization** (`eko.customization/1`) with `lifecycle`, `customizationId`, `revisions[]`
- Valid lifecycle transitions: `created → editing → saved → finalized → cart_attached → ordered` (+ reopen / cancel)
- `CustomizationLifecycle` helpers + `PersonalizationSessionManager.getCustomization()` / `markCartAttached()` / `markOrdered()`
- Cart / order payloads carry optional `customizationId` + `lifecycleStatus` (schema cart/1 unchanged)
- Woo meta `_eko_customization_id`, `_eko_customization_lifecycle`; SessionRepository indexes customization + lifecycle
- Transparent migration: session-only records → `customizationId === sessionId`

### Changed

- “Editar Personalização” resumes by `customizationId` / `sessionId` without spawning duplicates
- `add-to-cart` marks `cart_attached` and matches cart lines by customization or session id
- Checkout marks session repository lifecycle `ordered`

### Notes

- Editor `status` (active/autosaving/…) remains separate from business `lifecycle`
- `revisions` holds a tip today — multi-revision / collaboration can append without changing cart/order contracts
- Compatible with Template / Persistence / Export / Preview stages

## [Unreleased] — WooCommerce preview presentation (v0.8.5)

### Added

- PDP status panel after finalize: ✓ Personalização concluída + official `preview.png` thumb + last update time
- Button label switches to **Editar Personalização** and resumes the same `sessionId` (sessionStorage host state)
- `PreviewPresenter` PHP helper — raster detection / img HTML without regenerating previews
- Cart / checkout item name badge **Personalizado** + art name; thumbnail uses ExportProvider raster when present
- `add-to-cart` replaces the cart line for the same `sessionId` (edit without duplicating)
- Admin order panel shows official raster thumb; legacy domain orders keep previous message

### Changed

- Finalize no longer forces redirect to cart — PDP stays visible with “Ver carrinho”
- Frontend CSS enqueued on cart/checkout for shared preview styles

## [Unreleased] — Official ExportProvider (v0.8.4)

### Added

- **ExportProvider** platform contract with `createSessionPreview` + `formats`
- Providers: `DomainExportProvider`, `RasterExportProvider`, `CompositeExportProvider`, stubs `FuturePdfExportProvider` / `FuturePrintExportProvider`
- Factory `createSessionExport` — domain-only (standalone) or Domain+Raster (commerce)
- Commerce save/autosave/finalize generate official `preview.png` via ExportProvider (persisted on the session record)
- `EkoPrintStudio.configureExport` for host boot swaps
- `ProductionPreviewRef.filename` (`preview.png`) + `domainData` (JSON companion)

### Changed

- `PersonalizationSessionManager` no longer calls `buildProductionPreview` directly — only `ExportProvider`
- Woo commerce boot wires raster session export; standalone Creator keeps domain-only

### Notes

- PersistenceProvider contract unchanged — receives a finished `record.preview`
- Next step (Woo PDP/cart thumbnail UI) can consume the same `preview` contract without SDK changes

## [Unreleased] — Production Session Persistence Providers (v0.8.3)

### Added

- **SessionPersistenceProvider** platform contract (`saveSession` / `loadSession`) alongside document persistence
- Providers: `LocalPersistenceProvider` (sessions+docs), `InMemorySessionPersistenceProvider`, `CompositePersistenceProvider`, `WooCommercePersistenceProvider`
- Factory `createCommercePersistence` — Woo remote primary + Local fallback/mirror for commerce embeds
- PHP `SessionRepository` (CPT `eko_ps_session`) + `SessionToken` + REST `/sessions` / `/documents`
- `EkoPrintStudio.configurePersistence` for host boot swaps
- host-bridge passes `restUrl` + `persistenceToken` into the editor URL

### Changed

- `PersonalizationSessionManager` talks only to `SessionPersistenceProvider` (no concrete Local/Woo knowledge)
- Commerce boot no longer uses `LocalPersonalizationSessionStore` as the primary store

### Notes

- localStorage remains offline/fallback only in the WooCommerce persistence stack
- Standalone Creator still uses LocalPersistenceProvider

## [Unreleased] — Template Master Registry & Woo select (v0.8.2)

### Added

- **Template Registry** (`src/core/templates/`): official master catalog (`id`, `name`, `category`, `thumbnail`, `status`) seeded with Caneca Brasil, Cartão Premium, Flyer A5, Banner 90x120
- Public catalog at `public/templates/catalog.json` (`eko.templates.catalog/1`) for host sync
- WooCommerce **Template Master** `<select>` on product/variation (replaces free-text Template ID); meta `_eko_template_id` unchanged
- Plugin `TemplateCatalog` + optional **Sincronizar templates do editor** + REST `GET /eko-print/v1/templates`

### Changed

- `LocalDocumentProvider` seeds masters from the Template Registry (no direct `sampleDocuments` import)

### Notes

- Existing `_eko_template_id` values remain compatible; unknown ids appear as a legacy select option

## [Unreleased] — WooCommerce Production Plugin (v0.8.1)

### Added

- **WordPress/WooCommerce production plugin** at `integrations/woocommerce/eko-print-studio/`
  - Admin settings: editor URL, embed mode (modal/iframe/page), language, theme, debug, timeout, autosave, preview, environment
  - Product → Template association (+ variation-ready meta)
  - Frontend host bridge (`Personalizar`) with lazy-loaded assets
  - REST: product-context, validate-cart, add-to-cart, order-payload, audit (nonce + capability checks)
  - Cart meta `eko_personalization` (`CommerceCartPayload`)
  - Order meta `_eko_commerce_order` (`CommerceOrderPayload`) + admin reopen panel
  - Dedicated editor shell route `/eko-print-studio/editor/`
- **`bootWooCommerceFromUrl`** — editor app boots personalization from query params (SDK adapter only)
- App Save in commerce embed mode finalizes and notifies the Woo host via postMessage

### Notes

- Plugin is intentionally thin: no editor logic, no Core imports
- Payload validation mirrored in CI (`tests/commerce/WooCommercePlugin.test.ts`)

## [Unreleased] — Commerce Integration & Production MVP (v0.8.0)

### Added

- **Commerce contracts** (`types/commerce`): product context, personalization session record, cart/order payloads, production preview ref, embed modes
- **PersonalizationSessionManager** (SDK): start / resume / autosave / save / finalize / cancel — DocumentProvider + PersistenceProvider
- **LocalPersistenceProvider** + **LocalPersonalizationSessionStore** for local/remote-ready session persistence
- **Production preview** (`sdk/preview`): domain-faithful JSON snapshot (+ raster hook via ExportProvider)
- **PostMessage host bridge** for iframe/modal embeds (SDK host layer)
- **WooCommerceAdapter** (`adapters/woocommerce`): open editor → edit → preview → cart meta → order attach → admin re-edit — **SDK + types only**
- Platform events: SessionStarted/Saved/Autosaved/Finalized/Cancelled/Resumed, CartPayloadReady, OrderPayloadReady, PreviewGenerated

### Notes

- Core remains unaware of WooCommerce / WordPress / PHP
- Shopify / Magento / Nuvemshop should reuse the same commerce contracts
- Full production raster/PDF export remains optional via ExportProvider

## [Unreleased] — Creator Experience & Design System (v0.7.0)

### Added

- **Design System** (`src/ui`): tokens (spacing/radius/typography/elevation/animation/shadow/border/palette), ThemeEngine (light / dark / canva), reusable primitives (Button, IconButton, Input, Tabs, Switch, Toast, Dialog, Spinner, Skeleton, FloatingToolbar, ContextMenu, …)
- **SDK Creator Session** (`sdk/session` + `EditorProvider`): UI habla solo con SDK — undo/redo/zoom/fit/grid/guides/save/open/properties/capabilities/layers/assets/notify
- **Workspace UI**: painéis redimensionáveis, Top Bar completa (Undo/Redo/Zoom/Fit/Grid/Guides/Preview/Open/Save/Theme), Left Sidebar com seções Templates/Text/Shapes/Images/Uploads/Assets/Layers/Projects/Brand/Apps
- **Floating Toolbar** e **Context Menu** baseados em capabilities (ObjectRegistry via SDK)
- **Notifications** via `platformEvents.Notify` / `Confirm` + ToastHost / ConfirmHost
- **ElementsQuickAdd** — inserir texto/formas pelo fluxo Commands

### Changed

- `App` monta `EditorProvider`; painéis Properties / Layers / Assets / Pages consomem SDK (não Core)
- Canvas Konva permanece adaptador de paint (exceção documentada); chrome Creator é embarcável

### Notes

- Fluxo MVP: abrir template → editar → preview → salvar JSON → host (WooCommerce etc.) consome via adapters
- Nenhum componente `src/ui` conhece o editor

## [Unreleased] — Rendering & Platform Engine (v0.6.0)

### Added

- **Render Pipeline** (`core/render`): modular passes (Visibility → Render → Lock → Transform → Clip → Opacity → Effects → Overlay), `RenderContext`, `RendererRegistry`, `RenderCache`, `RenderLayers`, `OverlaySystem`
- **Builtin object renderers** producing framework-agnostic drawables: text / image / shape / group / frame / table / stub (+ SVG/QR/barcode/mask/mockup aliases)
- **GraphicsAdapter / CanvasAdapter** contracts in Core; **KonvaAdapter** outside Core (`src/adapters/konva`) — Core never imports Konva
- **Platform provider contracts** (interfaces only): Storage, Asset, Font, Upload, Export, Clipboard, Localization, Theme, Configuration, Persistence
- **Host bridge** (MessageBus / RPC / Callbacks) — browser-free; postMessage / CustomEvent bind in host adapters later
- **PluginRegistry** — register objects, renderers, tools, panels, commands, shortcuts, menus, overlays, passes
- **SDK façade** `EkoPrintStudio` — `load` / `open` / `save` / `export` / `on` / `off` / `register` / `destroy`
- **Platform events**: DocumentOpened/Saved, SelectionChanged, Object*, PageChanged, ZoomChanged, ToolChanged, Interaction*

### Changed

- `EventBus` catalog expanded (`platformEvents`); store emits Selection / Page / Zoom platform events
- `ObjectLayer` resolves Konva nodes via `objectRegistry.rendererKey` (open/closed)

### Notes

- Layout `RendererAdapter` remains the domain frame projector (`ResolvedLayout` → `RendererFrame`); paint backends implement `CanvasAdapter`
- WooCommerce / Shopify / React / Vue adapters are **out of scope** — they will consume public APIs only

## [Unreleased] — Object System & Property Engine (unified)

### Added

- **Unified object contract** on `ElementBase`: `createdAt` / `updatedAt`, `selectable`, `pageId`, shared `appearance` + `layout`, structured metadata
- **Transform pivots** `originX` / `originY` (0–1) on every transform
- **ObjectRegistry 2.0**: icon, rendererKey, capabilities, factories for text/image/shape/group/frame/table/svg/qr/barcode/mask/mockup/variable
- **ObjectFactory** + **NamingEngine** (Text 1, Rectangle 2, …)
- **StyleEngine** — appearance fill/stroke/opacity/shadow/blend/gradient prep; mirrors into type properties
- **ConstraintEngine** — left/right/top/bottom/center/stretch/scale (AnchorSystem-backed)
- **HitTestEngine** — document-space picking for large documents
- **PropertyEngine** — `getValue` / `patch` / `mergeDefaults` / `migrateElement` / sanitize via registry
- **GroupEngine** — descendant move/transform propagation + bounds recompute
- **LayerEngine** — `moveBefore` / `moveAfter`

### Changed

- `normalizeDocument` migrates all elements into the unified contract
- `MoveElement` / `TransformElement` on groups propagate to nested children
- New element types `frame` / `table` registered (domain-ready; renderers later)

## [Unreleased] — Document & Workspace Engine

### Added

- **Document & Workspace platform** (extends v0.3.0 Document Layout foundations):
  - `DocumentEngine` — metadata / canvas config / multi-page preparation
  - `WorkspaceEngine` — infinite pasteboard, page placements, workspace bounds, fit-workspace
  - `PageEngine` — list / add / duplicate / **delete** / **reorder** / navigate
  - `LayoutEngine` — printable / safe / bleed / margin / crop bounds (render-independent)
  - `UnitsEngine` — mm / cm / px / **in** / **pt** (centralized conversions; `document/units` re-exports)
  - `CoordinateSystem` — document ↔ workspace ↔ viewport ↔ screen ↔ region
  - `RulerEngine` — zoom-aware tick models (UI-ready)
  - `GridEngine` — overlay lines + snap step; `GridLayer` on canvas
  - `GuidesEngine` evolution — lock / visibility / page scope / hydrate / snapTargets
  - Commands: `DeletePage`, `ReorderPages`
  - Infinite canvas pasteboard behind the page (pan unconstrained by paper size)

### Changed

- Store owns `workspace` + `grid` state; rebuilds placements on page ops / undo / redo
- Bootstrap / import hydrate persistent guides into `guidesEngine`

## [Unreleased] — Editor Experience (EX) / Phase 2.1 Professional Interaction

### Changed

- **Phase 2.1 UX refinement:** Canva-quality interaction polish on existing Interaction Engine
  - Smart guides: object snap enabled by default, priority-ordered snap, spacing guides, persistent guide targets
  - Multi-transform: shared bounding box resize/rotate/flip via `TransformElements` / `FlipElements`
  - Multi-select marquee respects Shift (add) and Ctrl/Cmd (toggle)
  - Hover outline + interaction modes (`hover`, `resizing`, `rotating`, `editing`)
  - Smooth zoom / fit / double-click zoom-to-cursor; zoom-to-selection animation
  - Clipboard: parent-id remapping + OS clipboard serialize/load prep
  - Align / distribute (Alt+Shift+arrows / H / V / X / Y) via `AlignmentGuides`
  - Keyboard fully centralized (Shift keep-ratio, Ctrl+Shift+D diagnostics bridge)
  - Transformer visual polish (Canva-like anchors / border)

### Fixed

- Text resize bakes `fontSize` from height ratio (no permanent scale on text)
- `TransformElement` validates move / resize / rotate independently (denied fields stripped)
- Demo document: unlocked customer text + new editable title & shape; protected chrome selectable with clear UX
- Text hit area uses full bounding box; protected elements show `not-allowed` cursor
- Layers Panel: Sistema badge + lock affordance for protected template elements

### Added

- **EX-1.1 Text editing:** `InteractionSession`, `ElementScreenBox`, `TextEditOverlay`
- Double-click / double-tap on `TextNode` starts text edit; Enter / Blur commit, Esc cancels
- **Asset Library Experience** (`editor/assets`): `AssetLibrary`, `AssetGrid`, `AssetCard`
- `InsertAsset` command — insert image/svg/template placeholder onto the active surface (centered)
- Pure helpers: `listDocumentLibraryAssets`, `createElementFromAsset`

## [0.5.1] — Stability Layer

### Added

- React `ErrorBoundary` around the canvas region with user-facing fallback
- Dev-only **Eko Diagnostics** panel (`Ctrl+Shift+D`)
- `DocumentHealth` read-only consistency audit (`errors` / `warnings`)
- Renderer metrics collector for diagnostics (dev-only)

### Fixed

- Canvas container CSS height chain and Stage sizing (renderer stability)

### Changed

- Removed temporary canvas debug instrumentation; errors surface via Error Boundary in dev

## [0.5.0] — Property & Attribute Engine

### Added

- PropertyEngine with typed schemas and property groups
- `UpdateProperty` command (`path`, `oldValue`, `newValue`)
- PropertiesPanel sections: Transform, Appearance, Typography, Content
- Rule-aware editable descriptors (locked fields show reason)

### Changed

- PropertiesPanel no longer mutates element JSON directly; all edits go through PropertyEngine → Commands

## [0.4.0] — Document Graph & Layer Engine

### Fixed

- Infinite loading / Konva ref loop / StrictMode bootstrap race

### Added

- Document Graph, Layer Engine, Group Engine, Layers Panel

## [0.3.0] — Document & Layout Engine

### Added

- Pages, surfaces, regions, layout resolver

## [0.2.0] — Interaction Engine

### Added

- Selection, keyboard, clipboard, transformer, snapping, viewport

## [0.1.0] — Foundation Release

### Added

- Foundation core
