---
source: src/app/components/app-nav-item.ts
sha256: 7f06e52c23e12b33f36b566e349f9736de7a55a8954bf4549974667eaab97c72
signature: d167d5eda66c01023b12051b48953a97db22c82b2d0818c4903188f6ce89619e
generated_at: 2026-11-10T02:53:33.568832+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/app-nav-item.ts

## Purpose

Single-purpose type file that exports the `AppNavItem` interface. It was extracted from `AppNavMenu.vue` because TypeScript-ESLint's type-aware rules (`no-unsafe-*`) could not reliably resolve types exported from `.vue` SFCs, producing spurious lint errors. The shape is plain data with no SFC-specific logic, so it lives here as a `.ts` module both components can import.

## Key elements

- **`AppNavItem`** (exported interface) — the resolved shape of one navigation entry for the current visitor. Fields:
  - `name` – stable route name; serves as the render `key`.
  - `title` – translated label.
  - `group?` – translated group heading; adjacent entries sharing the same `group` render one heading above the first.
  - `to` – locale-prefixed destination (`RouteLocationRaw`).
  - `icon?` – Lucide component rendered before the label; absent → no icon slot.
  - `badge?` – live count; `undefined` → no badge.
  - `detail?` – live text beside the icon of a pinned entry; `undefined` → none.
  - `pinned?` – lifts the entry out of its section menu onto the main bar.
- **Imports** – `Component` (vue) and `RouteLocationRaw` (vue-router), both type-only.

## Relationships

No graph neighbors are recorded for this file. The doc comment indicates it is imported by at least two SFC components, but those edges do not appear in the dependency graph data.

## Notes

- The file is intentionally a pure type declaration with no runtime exports; it exists solely to give ESLint a `.ts` entry point it can resolve.
- `name` is the stable identifier across locales—use it (not `title` or `to`) as the Vue `:key` when rendering lists of `AppNavItem`.
- Optional fields use `undefined` (not `null`) as the "absent" sentinel; rendering logic checks for `undefined` to skip badges, icons, and detail text.
