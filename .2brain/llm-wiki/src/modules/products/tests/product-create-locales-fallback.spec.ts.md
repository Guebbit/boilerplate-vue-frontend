---
source: src/modules/products/tests/product-create-locales-fallback.spec.ts
sha256: f145974819d2b47c9b27ca159ba9aa6bc30dac8dc682df5fbe5c1684877a1efd
generated_at: 2026-10-02T15:35:30.492015+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-create-locales-fallback.spec.ts

## Purpose

Verifies that the `ProductCreate` form still renders (on a single fallback-language tab) when `GET /locales` fails, rather than hanging on the skeleton loader that appears while locale data is unresolved. Part of the LOCALES_OPTIONAL_0925 epic (step 6b).

## Key elements

- **`wireModulesIntoCore()`** — imported from `tests/support/unit/wire-modules.ts`; registers enabled modules with the kernel registry before tests run.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a controllable mock so the test can dictate which API calls fail.
- **Router (memory history)** — built from `collectModuleRoutes(enabledModules)` under a `/:locale` parent route, giving the component a real route context (`/en/products/new`).
- **`beforeEach`** — resets the Pinia store, configures `orvalMutator` to *reject* `/locales` (simulating 404) and resolve every other URL with `{ data: {} }`, then loads locale `'en'` and navigates.
- **`mountCreate()`** — mounts `ProductCreate` with `router`, `vuetify`, `i18n`, and a pass-through `LayoutDefault` stub.
- **Single assertion block** — after `flushPromises`, asserts `.v-skeleton-loader` is absent and `[data-test=translation-tab-en]` is present.

## Relationships

- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore()`, which the spec calls at module scope to register `enabledModules` with the kernel registry so `collectModuleRoutes` can produce the correct route tree for the in-memory router.

## Notes

- The `orvalMutator` mock is intentionally broad: every URL *except* `/locales` resolves successfully with an empty `{ data: {} }` body. This isolates the failure to the locales call only.
- The test relies on `flushPromises` (not `waitFor`) to let the rejected `/locales` promise settle; missing this would cause the skeleton assertion to be evaluated too early.
- The `LayoutDefault` stub is a bare `<slot />` wrapper — if the real layout renders navigation or other async content, it is excluded from this test's DOM.
