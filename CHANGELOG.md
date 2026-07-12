# Changelog

All notable changes to Eko Print Studio are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/), and this project uses [Semantic Versioning](https://semver.org/).

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
