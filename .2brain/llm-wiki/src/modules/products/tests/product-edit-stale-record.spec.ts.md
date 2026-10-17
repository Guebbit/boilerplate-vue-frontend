---
source: src/modules/products/tests/product-edit-stale-record.spec.ts
sha256: 4c2394ef73d34a59cc43fb8e35b0212563485a4bcd1d2604e00b910260352923
generated_at: 2026-10-17T01:32:10.760685+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-edit-stale-record.spec.ts

## Purpose

Verifies that when `ProductEdit.vue` receives a **412 Precondition Failed** response on save (the product changed server-side after the form loaded), the form surfaces an in-place *warning* (not an error), offers a "reload latest" action, and never auto-resends the stale edit. It also confirms that pressing "reload latest" triggers a fresh admin-record read and clears the warning.

## Key elements

- **`mountRefused()`** – Mounts `ProductEdit` with a mocked `orvalMutator` that resolves `/locales` and `/products/p1/admin` reads but **rejects** any `PATCH` with the `PRECONDITION_FAILED` envelope. Returns the hydrated wrapper after `flushPromises`.
- **`adminReads()`** – Counts how many times the mocked mutator was called with `url === '/products/p1/admin'`; used to assert the reload action fired exactly one additional read.
- **`echo(body)`** – Builds a minimal valid admin-record payload (`id`, `title`, `price`, `currency`, `translations`) so the post-reload GET has a parseable shape.
- **`PRECONDITION_FAILED`** – The reject envelope (`success: false`, `status: 412`, errors array) matching the client's rejection contract.
- **`router`** – Memory-history Vue Router wired with the real `collectModuleRoutes(enabledModules)` tree so the component's route params resolve.
- **Three `it` blocks** – (1) warning appears with `warning` severity and a reload button exists; (2) clicking reload triggers exactly one extra admin read and removes both the button and the alert; (3) only one PATCH call was made in total (no automatic retry).

## Relationships

- **`src/modules/products/views/ProductEdit.vue`** – The component under test; mounted directly with `props: { id: 'p1' }`.
- **`src/infrastructure/http/index.ts`** – `orvalMutator` is imported from here and replaced via `vi.mock`; all HTTP traffic (GETs and the rejected PATCH) flows through this single mock.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope before any test runs, registering module-level side effects (stores, event bus) that `ProductEdit` depends on.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – Provides `orvalEnvelope` and `parseOrvalFixture` to wrap raw payloads in the real orval response envelope so the component's normal parsing path is exercised.

## Notes

- The file's header comment notes it "mirrors" the mounting sequence in `product-edit-no-withdrawal.spec.ts`; if that spec's setup changes, this spec likely needs the same update.
- The rejection value is a plain object, not an `Error`. An inline `eslint-disable` documents that this is the API client's contractual rejection shape—don't "fix" it into `new Error(...)`.
- DOM queries use `data-test` attributes (`product-edit-submit-error`, `product-edit-reload-latest`) rather than semantic selectors; the view must keep those attributes for this spec to pass.
- `beforeEach` resets the Pinia store and the mock, then navigates to `/en/products/p1/edit` and awaits `router.isReady()`—skipping any of these steps causes stale-state failures.
