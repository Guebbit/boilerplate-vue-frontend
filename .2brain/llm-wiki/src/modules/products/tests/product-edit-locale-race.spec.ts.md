---
source: src/modules/products/tests/product-edit-locale-race.spec.ts
sha256: 3ffb86b6634c4091a632b34c06bf0be405c6f4a89f392cc9b7d880c7529e221a
generated_at: 2026-10-17T01:31:22.274485+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-edit-locale-race.spec.ts

## Purpose

Reproduces a fetch-ordering race in `ProductEdit.vue`: the page's independent `fetchActiveLocales()` (`GET /locales`) answering before `loadAdminProduct()` (`GET /products/{id}/admin`). Verifies the tab bar does not open a translation tab until the admin record (and its `form.translations` entry) actually arrives, preventing a render crash from accessing a missing `form.translations[tag]!.title`.

## Key elements

- **`deferred<T>()`** — Local helper returning `{ promise, resolve }` so the test controls exactly when each endpoint's promise settles.
- **`LOCALES_RESPONSE` / `ADMIN_RESPONSE`** — Inline fixture payloads (one active locale `en`; one product row with an `en` translation) shaped to match the orval API contracts.
- **`router`** — `createRouter` with `createMemoryHistory`, scoped to `collectModuleRoutes(enabledModules)`. No guards attached; allows navigating to the admin edit route without an auth session.
- **`wireModulesIntoCore()`** — Called at module level to register module routes/stores into the Pinia + router graph before tests run.
- **`vi.mock('@/infrastructure/http')`** — Replaces `orvalMutator` with a hand-driven mock that returns the deferred promises per URL, giving the spec per-endpoint scheduling control.
- **The single `it` block** — Resolves the locales promise first, asserts no tab/field rendered and no render errors; then resolves the admin promise and asserts the tab and title field appear correctly.

## Relationships

- **`src/modules/products/views/ProductEdit.vue`** — The component under test. The spec mounts it and exercises its tab-opening logic under the specific fetch ordering.
- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore()`, which registers enabled modules' stores and routes so the router and Pinia instance see the same wiring the real app uses.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — Supplies `orvalEnvelope` (wraps a payload in the orval success-envelope shape) and `parseOrvalFixture` (validates the fixture against the generated schema before returning it), ensuring mocked responses are contractually valid.

## Notes

- The bug this spec guards against is **invisible** to `@vue/test-utils` without `global.config.errorHandler`: the throw occurs inside Vue's own reactivity flush, not in the spec's call stack, so it never surfaces as a rejected promise. The handler collects errors into a local array that the assertions check.
- The `orvalMutator` mock is deliberately **hand-driven** (one deferred per endpoint) rather than using the automatic sequence mock pattern seen in `products/store.spec.ts`, because the test needs to interleave resolutions in a specific order.
- Mirrors the real-router mount pattern from `product-view.spec.ts` (same `collectModuleRoutes` + `enabledModules` template).
