# Changelog

All notable changes to Eko Print Studio are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/), and this project uses [Semantic Versioning](https://semver.org/).

## [Unreleased] — Editor Experience (EX)

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
