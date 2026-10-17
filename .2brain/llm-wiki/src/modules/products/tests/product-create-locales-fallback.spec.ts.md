---
source: src/modules/products/tests/product-create-locales-fallback.spec.ts
sha256: bf44a9a24c5a602d669815590a4b421a79c5abe9825616b786208d9c51c5e489
generated_at: 2026-10-17T01:30:44.360659+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-create-locales-fallback.spec.ts

## Purpose

Verifies that `ProductCreate` still renders a usable form (one fallback-language tab) when `GET /locales` fails, instead of being stuck on the Vuetify skeleton loader shown while `openTags` is empty. It guards against a regression where a missing or unreachable `locales` endpoint would leave the create page in a perpetual loading state.

## Key elements

- **`mountCreate`** — thin wrapper that mounts `ProductCreate` with the shared router, Vuetify, and i18n plugins.
- **`router`** (module-level) — a `createMemoryHistory` router wired to the real module routes via `collectModuleRoutes(enabledModules)`, giving the test an authentic routing context.
- **`beforeEach`** — resets the `orvalMutator` mock so `GET /locales` rejects (simulating 404) while all other requests resolve with `{ data: {} }`; activates a fresh Pinia store; loads the `'en'` locale; navigates to `/en/products/new`.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a controllable function so the test can dictate per-URL responses.
- **`describe('ProductCreate — GET /locales unavailable')`** — single assertion pair: `.v-skeleton-loader` is absent and `[data-test=translation-tab-en]` is present.

## Relationships

- **`src/modules/products/views/ProductCreate.vue`** — the component under test; imported and mounted directly. The test asserts on its rendered DOM (skeleton class, `data-test` tab attribute).
- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore()`, called once at module load to register enabled modules into the kernel registry so `collectModuleRoutes` can build the real route table.

## Notes

- `wireModulesIntoCore()` runs **before** the `router` constant is evaluated; reordering these two imports would silently produce an empty route list.
- The mock is surgical: only the `/locales` URL is rejected; every other `orvalMutator` call resolves with an empty `{ data: {} }` payload, so unrelated requests in the form don't error.
- The fallback tab is identified by the `data-test="translation-tab-en"` attribute — a Vuetify-specific `.v-skeleton-loader` class is used for the negative assertion, coupling the test to that Vuetify class name.
- Uses a **real** memory-history router (not a stub), so route guards and `RouterView` nesting behave as in production; this is intentional to catch issues that a fake router would hide.
