---
source: src/modules/products/composables/use-active-locales.ts
sha256: d11c3fbbbe9cab83660ac46b739b16dbf7246a78cdc3174b67f94f10c33fa294
generated_at: 2026-10-17T01:27:22.837923+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/composables/use-active-loales.ts

## Purpose

Provides the list of active locales a product form's language tabs need. It fetches `GET /locales` via `@api` directly, filters to active entries, and guarantees a usable single-tab fallback when the optional `locales` module is uninstalled or the endpoint is unreachable.

## Key elements

- **`useActiveLocales()`** (exported) — Returns `{ locales, fallbackLocale, loading, fetchActiveLocales }`. `locales` is `Ref<LocaleCapability[]>` (active entries only), `fallbackLocale` is `Ref<string>`, `loading` is a `Ref<boolean>`, and `fetchActiveLocales()` is the trigger. The promise from `fetchActiveLocales` never rejects.
- **`configuredFallbackLocale()`** (internal) — Resolves the deployment's fallback locale tag from `runtimeValue('APP_FALLBACK_LOCALE')`, `VITE_APP_FALLBACK_LOCALE`, defaulting to `'en'`.
- **`fallbackOnlyManifest(tag)`** (internal) — Builds a minimal `LocaleCapability` object (LTR, `apps: ['frontend']`, `source: static`, `entryCount: 0`) so the form renders one functional tab when no locale data is available.

## Relationships

- **`src/modules/products/tests/use-active-locales.spec.ts`** — Unit tests for the composable's fetch, filter, and fallback paths.
- **`src/modules/products/views/ProductCreate.vue`** — Consumes `useActiveLocales` to populate the `TranslationTabs` component on the create form.
- **`src/modules/products/views/ProductEdit.vue`** — Consumes `useActiveLocales` to populate the `TranslationTabs` component on the edit form.

## Notes

- **Module boundary:** Imports `getLocales` from `@api` rather than reaching into the `locales` module store. The `locales` module intentionally ships no barrel (`index.ts`), and the backend enforces that `products` never imports `locales`. `@api` is treated as shared infrastructure, not a sibling module, so no `MODULE_EDGES` entry is needed.
- **`fetchActiveLocales` never rejects.** Any network error or 404 silently swaps in the single-tab fallback manifest, keeping the caller's skeleton from hanging indefinitely.
- The composable is **not** a Pinia/Vuex store; each call creates independent `ref` state scoped to the calling component.
