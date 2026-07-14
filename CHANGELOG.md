# Changelog

All notable changes to Eko Print Studio are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/), and this project uses [Semantic Versioning](https://semver.org/).

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
