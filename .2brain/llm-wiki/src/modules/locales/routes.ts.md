---
source: src/modules/locales/routes.ts
sha256: b3ab9cc6e0dfb1cb69e8eda5ee552bf5177ba036e25ad3be982abf9350ad9001
generated_at: 2026-10-17T01:04:22.383817+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/routes.ts

## Purpose

Declares the four locale-management routes (languages board, dictionary, per-language entries, and a generic entity-translations view) as a plain `RouteRecordRaw[]`. The array is lazy-loaded per route and spliced into the application router by the module registry, so this file is the single source of truth for URL patterns, route names, and access-control metadata for the locales module.

## Key elements

- **`export default [] satisfies RouteRecordRaw[]`** — The sole export. An array of four route records; `satisfies` preserves literal types while still enforcing the `RouteRecordRaw` contract.
- **`LocalesList`** (`/locales`) — Board listing all languages. Requires `update:Locale`.
- **`LocalesDictionary`** (`/locales/dictionary`) — All-languages dictionary view. Static segment deliberately placed *before* the `:tag` route so vue-router's ranking is explicit and the tag `"dictionary"` is reserved.
- **`LocaleEntries`** (`/locales/:tag`) — Entries for a single language. Uses `:tag` (not `:locale`) to avoid silently shadowing the parent route's own `:locale` param in navigation guards.
- **`EntityTranslations`** (`/locales/translations/:entityType/:id`) — Generic translation screen for any entity. Gated on `read:Translation` rather than a product key, keeping the permission separable from `update:Product`.
- **`meta` on every route** — Carries `access: 'auth'`, a `can` permission tuple, and a `title` i18n key consumed by the layout/guard layer.

## Relationships

- **`src/modules/locales/module.ts`** — Imports this default array and registers it with the central router (the "module registry" mentioned in the file docblock).
- **`src/modules/locales/tests/routes.spec.ts`** — Tests the exported route array (paths, names, meta, and lazy-load shape).

## Notes

- The param is `:tag`, **not** `:locale`. A parent route above this module already owns `:locale` for the UI language; a nested duplicate would be silently shadowed in every guard. Do not "fix" this to `:locale`.
- `locales/dictionary` is a static segment that must appear *before* `locales/:tag` in the array. vue-router would rank it higher anyway, but the ordering is load-bearing for the invariant that no language may literally be tagged `"dictionary"`.
- The `EntityTranslations` route uses `read:Translation` on purpose. No shipped role holds *only* that permission today, but the key is intentionally separable from `update:Product` for a future translations-only role.
- All `component` values are `() => import(...)` arrow wrappers for code-splitting; the router's lazy-load path depends on this shape.
