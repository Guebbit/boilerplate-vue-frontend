---
source: src/modules/locales/routes.ts
sha256: b3ab9cc6e0dfb1cb69e8eda5ee552bf5177ba036e25ad3be982abf9350ad9001
signature: b3ab9cc6e0dfb1cb69e8eda5ee552bf5177ba036e25ad3be982abf9350ad9001
generated_at: 2026-11-10T04:41:03.167952+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/routes.ts

## Purpose

Defines the route table for the locale-management area of the app. It exports a plain array of `RouteRecordRaw` records (four routes) that the module registry splices into the Vue Router instance. Every view is lazy-loaded via dynamic `import()`.

## Key elements

- **Default export (`RouteRecordRaw[]`)** — the four-route table, typed with `satisfies RouteRecordRaw[]`:
  - `LocalesList` — `locales` → `LocalesList.vue`. Requires `update:Locale`.
  - `LocalesDictionary` — `locales/dictionary` → `LocalesDictionary.vue`. Static segment placed before the param route so it wins in ranking and so no language can be literally tagged `"dictionary"`.
  - `LocaleEntries` — `locales/:tag` → `LocaleEntries.vue`. Requires `update:Locale`.
  - `EntityTranslations` — `locales/translations/:entityType/:id` → `EntityTranslations.vue`. Gated on `read:Translation` (not `update:Locale`), keeping the permission separable from the product-level edit key.

- **`meta` on every route** — carries `access: 'auth'`, a `can` permission tuple, and an i18n `title` key. These are consumed by the global navigation guard / permission layer, not by the views themselves.

## Relationships

- **`src/modules/locales/module.ts`** — the module registry imports this default array and registers the routes with the app-level router. This file is a pure data source; it does not create or mutate the router.
- **`src/modules/locales/tests/routes.spec.ts`** — unit-tests the exported route array (paths, names, meta shape, component references).

## Notes

- **`:tag` vs `:locale`.** The param is named `:tag` deliberately. A parent route above this subtree already owns `:locale` for the UI interface language; a nested duplicate would silently shadow it inside every navigation guard.
- **Route ordering.** `locales/dictionary` is listed before `locales/:tag` not because vue-router requires it (statics rank higher regardless), but to make the intent visible and to reserve the tag `"dictionary"`.
- **`EntityTranslations` permission.** It uses `read:Translation` rather than `update:Locale` so a hypothetical translations-only role could access it without also holding `update:Product`. No currently shipped role exercises that split, but the key is kept separable for that purpose.
