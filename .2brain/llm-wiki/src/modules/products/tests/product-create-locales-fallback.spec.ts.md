---
source: src/modules/products/tests/product-create-locales-fallback.spec.ts
sha256: fb06a58bfedbc2ff44aba44ee9e96b05cf206a2354d51525c3761a3bf5bf195b
signature: 0603f499c9bd5123232091feb16251081e104100162cb40dadce6e457aa39a83
generated_at: 2026-11-10T05:25:26.463143+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-create-locales-fallback.spec.ts

## Purpose

Verifies that the `ProductCreate` form degrades gracefully when `GET /locales` fails (e.g. the locales module is uninstalled or the backend is unreachable). Instead of remaining stuck on the skeleton loader (shown while `openTags.length === 0`), the form must render a single fallback-language tab ("en").

## Key elements

- **`beforeEach` setup** – Creates a fresh Pinia store, resets and re-mocks `orvalMutator` so that only the `/locales` call rejects (simulating a 404) while all other HTTP calls resolve with `{}`. Loads the `en` locale and navigates the real memory-history router to `/en/products/new`.
- **`mountCreate`** – Helper that mounts `ProductCreate` with the real `router`, `vuetify`, and `i18n` plugins (no shallow stubs).
- **`describe('ProductCreate — GET /locales unavailable')`** – Contains a single test asserting that after `flushPromises` the `.v-skeleton-loader` element is absent and the `[data-test=translation-tab-en]` element is present.
- **`vi.mock('@/infrastructure/http')`** – Replaces the HTTP transport so the test can deterministically fail only the `/locales` endpoint.

## Relationships

- **`src/modules/products/views/ProductCreate.vue`** – The component under test; imported and mounted directly (not via a route component tree in the assertion, though the router does carry the real module routes).
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope to register all enabled modules with the kernel/registry before the test file's imports resolve, ensuring `collectModuleRoutes(enabledModules)` picks up the products routes.

## Notes

- The test uses a **real** `createMemoryHistory` router populated with `collectModuleRoutes(enabledModules)`, not a stubbed router. This means route-level guards and child-component resolution are exercised.
- Only the `/locales` URL is made to fail; every other `orvalMutator` call resolves with an empty object. If the component makes other HTTP calls during mount, they will silently succeed.
- The fallback language hard-coded in the assertion is `"en"` (matching the `loadLocale('en')` call in `beforeEach`). If the fallback strategy changes to a different default locale, this assertion must be updated accordingly.
- `wireModulesIntoCore()` is called once at the top of the module (not inside `beforeEach`), relying on it being idempotent or safe to call once per test file.
