---
source: src/app/components/app-nav-item.ts
sha256: f8cdaad3e887828204f39069ec9795959d1775234d2e71bb6f5ce93cb809890a
generated_at: 2026-10-02T11:46:31.943780+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/app-nav-item.ts

## Purpose

A type-only module that defines the `AppNavItem` interface — the shape of a single resolved navigation entry (translated, locale-prefixed, counted). It was extracted from `AppNavMenu.vue` (FA95) because TypeScript-ESLint's type-aware rules could not reliably resolve a type exported from a `.vue` SFC, producing `no-unsafe-*` noise in `AppNavigation.vue`. The interface is pure data with no SFC-specific behavior, so it lives in a plain `.ts` file imported by both nav components.

## Key elements

- **`AppNavItem` (interface)** — The sole export. Describes one navigation item as rendered for the current visitor:
  - `name: string` — Stable route name across locales; used as the render key.
  - `title: string` — Translated display label.
  - `to: RouteLocationRaw` — Locale-prefixed destination (from `vue-router`).
  - `icon?: Component` — Lucide icon component; omitted → no icon slot.
  - `badge?: number` — Live count; `undefined` → no badge.
  - `detail?: string` — Live text beside a pinned entry's icon; `undefined` → none.
  - `pinned?: boolean` — Lifted onto the nav bar beside the account menu.

## Notes

- This file contains **no runtime code** — only a type import (`Component` from `vue`, `RouteLocationRaw` from `vue-router`) and an interface export. It is erased at compile time.
- The module-level doc comment documents the rationale for extraction (FA95 / `allowComponentTypeUnsafety`). If you see a second copy of this shape in a `.vue` file, prefer this import over redefining.
- No graph neighbors are registered; the file is a leaf type dependency.
