---
source: src/modules/products/tests/product-edit-locale-race.spec.ts
sha256: fa5cc93915fda3372cc771d19bc4e30221b645c313411a4c4985f42c0e0abb83
signature: 9405fd2c7bfb19363d8aa852947c448e9bc6907d6b951e0e674826fc7743af4d
generated_at: 2026-11-10T05:26:11.185934+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-edit-locale-race.spec.ts

## Purpose

Regression spec that reproduces a fetch-ordering race in `ProductEdit.vue`: the independent `GET /locales` call resolves before `GET /products/{id}`, leaving `form.translations` empty while the fallback tag is already known. Before the fix this caused a render crash (`form.translations[tag]!.title` on `undefined`). The spec asserts the tab bar stays closed until the admin record lands and no render error is emitted.

## Key elements

- **`deferred<T>()`** – local helper that returns `{ promise, resolve }`, letting the test control the exact resolution order of each HTTP response (one deferred per raced endpoint).
- **`LOCALES_RESPONSE` / `ADMIN_RESPONSE`** – inline fixture payloads for `GET /locales` and `GET /products/p1` respectively; both pass through `parseOrvalFixture` before being resolved.
- **`router`** – a `createRouter` + `createMemoryHistory` instance scoped to `collectModuleRoutes(enabledModules)`; no auth guards, so the spec can push straight to `/en/products/p1/edit`.
- **`beforeEach`** – fresh Pinia, `loadLocale('en')`, then router push + `isReady`.
- **The single `it` block** – mocks `orvalMutator` to hand out per-URL deferreds, mounts `ProductEdit` with `global.config.errorHandler` collecting render errors, resolves `locales` first, asserts no tab/field exists and no errors, then resolves `admin` and asserts the tab and title field appear correctly.

## Relationships

- **`src/modules/products/views/ProductEdit.vue`** – the component under test; mounted with `props: { id: 'p1' }` and the real router so its route-level data fetching is exercised.
- **`tests/support/unit/orval-fixture-schema.ts`** – exports `parseOrvalFixture`, used to validate that the inline fixture objects conform to the expected Orval response schema before handing them to the deferred promises.
- **`tests/support/unit/wire-modules.ts`** – exports `wireModulesIntoCore`, called once at module scope to register the product module in the kernel registry so `collectModuleRoutes` can resolve its routes.

## Notes

- **`global.config.errorHandler` is load-bearing.** Vue render errors thrown inside its own reactivity flush are *not* surfaced as rejected promises to the test call stack; without this handler the crash is silent and the test would pass vacuously.
- The `orvalMutator` mock is driven manually (one deferred per URL) rather than through a generic mock server, which is what makes the resolution-order race deterministic.
- No router guards are attached (they live in `src/app/router/index.ts`), so the spec can reach the admin-only route without an authenticated session.
- The spec intentionally does **not** use `vi.useFakeTimers` or real delays; ordering is controlled entirely by which deferred is resolved first.
