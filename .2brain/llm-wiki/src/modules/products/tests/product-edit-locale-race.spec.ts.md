---
source: src/modules/products/tests/product-edit-locale-race.spec.ts
sha256: 8cafa59b9b09c08964553f6136fd11f00b3af65d50ad6e27a67b87f7ae937d77
generated_at: 2026-10-02T15:36:13.229978+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-edit-locale-race.spec.ts

## Purpose

Regression test for a render-crash race in `ProductEdit.vue`: when `GET /locales` resolves before `GET /products/{id}/admin`, the component's `openTags` logic previously opened the fallback tab while `form.translations` was still empty, causing a `Cannot read properties of undefined (reading 'title')` error inside Vue's reactivity flush. The test drives the two HTTP responses on independent schedules to verify the tab stays closed until the admin record actually arrives.

## Key elements

- **`deferred<T>()`** — Local helper that returns a `{ promise, resolve }` pair, letting the test resolve each endpoint's promise on its own schedule (one for `/locales`, one for `/products/p1/admin`).
- **`beforeEach`** — Activates a fresh Pinia, loads the `en` locale, and pushes the router to `/en/products/p1/edit` so the component mounts in a real-route context.
- **`describe('the edit form under a locales-before-admin-record race')` / `it(...)`** — The single test case. Resolves the locales deferred first, asserts no tab is open and no render error occurred, then resolves the admin deferred and asserts the tab opens with the correct title.
- **`global.config.errorHandler`** (in mount options) — Catches render errors thrown from Vue's internal reactivity flush, which `@vue/test-utils` does *not* surface as rejected promises. Collected into `renderErrors` and asserted to stay empty.
- **`vi.mock('@/infrastructure/http')`** — Replaces `orvalMutator` with a `vi.fn()` whose implementation routes by `config.url`, returning the respective deferred promise.
- **`router`** — A real `vue-router` instance (memory history) scoped to `collectModuleRoutes(enabledModules)`, matching the pattern in `product-view.spec.ts`. No auth guards are attached.

## Relationships

- **`tests/support/unit/wire-modules.ts`** → `wireModulesIntoCore()` is called at module top-level to register the enabled modules with the kernel registry before the router or component references them.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** → `orvalEnvelope` wraps raw payloads in the API's standard envelope shape; `parseOrvalFixture` validates and returns a typed response object, ensuring the mock responses match the real HTTP contract.

## Notes

- The `errorHandler` mount option is **load-bearing**: without it, the exact bug this test guards against is invisible (the error fires inside Vue's flush, not on the spec's call stack, so it never rejects a promise the test can `.catch`). Removing it would silently disable the regression guard.
- The test resolves locales *before* flushing, then asserts the tab is absent *before* resolving admin — the ordering is the entire point of the test.
- `LayoutDefault` is stubbed to a pass-through `<slot />`; the real layout is not needed and would pull in unrelated dependencies.
- The `orvalMutator` mock's fallback branch (`Promise.resolve(orvalEnvelope())`) handles any incidental extra requests (e.g., i18n lookups) so they don't hang the test.
