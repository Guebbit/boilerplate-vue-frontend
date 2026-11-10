---
source: src/modules/products/tests/product-edit-missing-record.spec.ts
sha256: 8dfa5ae0f3b2821c21ee193cb53770e60cc03d31d84f1d23bd20c7ef2296954f
signature: 4e473d1911216769c7ca45a6faf38be061132f84589ca29d3e9a462ff93c2f5f
generated_at: 2026-11-10T05:26:28.954995+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-edit-missing-record.spec.ts

## Purpose

Verifies that `ProductEdit.vue` handles a failed admin-record read (bypassing the toolkit cache) correctly: a 404/403 response redirects to the Error page, while any other failure shows a toast and keeps the visitor on the page. The test exists because the component reads the record without the toolkit's cache, so no `watch*` `onError` handler fires—failure handling is entirely in the component's own logic.

## Key elements

- **`apiRefusal(status, message)`** — Constructs an `Error` enriched with a `status` field and an `errors` array, mimicking the rejection shape the real API mutator produces.
- **`mountWithAdminRead(rejection)`** — Configures `orvalMutator` to reject only the `GET /products/p1` call, pushes the router to the edit route, mounts `ProductEdit` with full plugins, and flushes promises.
- **`replace`** — Module-level `MockInstance` spying on `router.replace`; re-created in `beforeEach` because the config's `restoreMocks` undoes spies between tests.
- **`addMessageMock`** — Stub function standing in for the toolkit's `useNotificationsStore().addMessage`, injected via a partial `vi.mock` of `@guebbit/vue-toolkit`.
- **`router`** — A memory-history router populated with all enabled module routes via `collectModuleRoutes(enabledModules)`.
- **`describe('ProductEdit — the admin record is not there')`** — Two cases: 404 → `router.replace({ name: 'Error', … })`; 500 → `addMessage` called, `replace` **not** called.

## Relationships

- **`src/infrastructure/http/index.ts`** — The module under test's HTTP layer. `orvalMutator` is fully replaced with a mock at setup time, so the real fetch/orval pipeline never runs during these tests.
- **`src/modules/products/views/ProductEdit.vue`** — The SUT. Mounted directly with `id: 'p1'`; the test asserts on its navigation and toast side-effects.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module load to register modules with the kernel registry so `collectModuleRoutes` can resolve them.

## Notes

- The `replace` spy must be re-created inside `beforeEach` (not once at module scope) because the Vitest config sets `restoreMocks: true`, which tears down spies before each test.
- The `orvalMutator` mock discriminates on `config.url === '/products/p1' && config.method === 'GET'`; all other calls resolve `undefined`. If the component issues additional requests, they silently succeed.
- The `@guebbit/vue-toolkit` mock uses `importOriginal` to preserve the real module surface while overriding only `useNotificationsStore`—other toolkit exports (composables, directives) remain functional during mount.
