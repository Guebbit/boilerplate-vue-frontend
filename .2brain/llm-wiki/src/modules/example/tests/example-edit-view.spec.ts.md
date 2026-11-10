---
source: src/modules/example/tests/example-edit-view.spec.ts
sha256: 2e4e0fb50acb64becc9673e65a93cd3e30708efd09b64b204e689c05483ff580
signature: 6d47bcded408e12569ebe8fa21026b74c6713fc819e736af7080efa323546304
generated_at: 2026-11-10T04:25:30.696943+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/example-edit-view.spec.ts

## Purpose

Integration test for the `ExampleEdit` view. It mounts the real component against a real memory-history router with the full plugin stack (Pinia, Vuetify, i18n) and asserts end-to-end edit-flow behavior: the form pre-fills from the store cache, a save sends only the changed fields as a merge, validation blocks locally, API refusals (500, 412) surface in-place, and server-listed actions render conditionally. Store method calls are spied at the store boundary so no HTTP layer is involved.

## Key elements

- **`mountPage(record?)`** – Seeds the store cache, sets `selectedExampleId`, spies on `watchExample` / `updateExample` / `setCover` / `fetchExample`, then mounts `ExampleEdit` with the shared router and plugins. Returns `{ wrapper, update, cover, fetch }` for per-test assertions.
- **`EXAMPLE`** – A single fixture record (`id: 'ex-1'`) shared by every case; tests override `actions` inline where needed.
- **`router`** – A `createRouter` with `createMemoryHistory` whose route tree comes from `collectModuleRoutes(enabledModules)`, giving a realistic `:locale` segment.
- **`wireModulesIntoCore()`** – Called once at module top-level to register modules with the kernel registry before routes are collected.
- **`describe('ExampleEdit')`** – Eight cases covering: pre-filled inputs, partial merge save (validated via `contractRequest`), no cover request when no image chosen, empty-title validation, 500 error banner, absence of a status field, server-action rendering, 412 + "reload latest" re-fetch, and read-only rendering when `actions.update` is false.

## Relationships

- **`src/modules/example/views/ExampleEdit.vue`** – The component under test; imported directly and mounted with `@vue/test-utils`.
- **`src/modules/example/store.ts`** – `useExampleStore` is instantiated per test; `updateExample`, `setCover`, `fetchExample`, and `watchExample` are spied so the view's outgoing calls are observable without network I/O.
- **`tests/support/unit/wire-modules.ts`** – Provides `wireModulesIntoCore`, which registers enabled modules with the core registry so `collectModuleRoutes` produces a valid route table.
- **`tests/support/unit/orval-fixture-schema.ts`** – Provides `contractRequest`, used to assert that the payload passed to `updateExample` conforms to the `UpdateExampleByIdBody` API schema.
- **`tests/support/unit/fixtures.ts`** – Provides `aProblem`, a helper for constructing RFC-7807-style error objects (500, 412) that the test injects via `mockRejectedValue`.

## Notes

- `beforeEach` pushes the router to `/en/examples/ex-1/edit` and awaits `router.isReady()` before each test, so the component always resolves its route param.
- The component is mounted with `attachTo: document.body` and `document.body.innerHTML` is cleared each case — required for Vuetify's focus management and portal-based overlays.
- `LayoutDefault` is stubbed to a pass-through slot so the app shell does not interfere with assertions.
- Spies are created inside `mountPage` (per call), not in `beforeEach`; this guarantees each test gets independent spy instances and clean call counts.
- The "sends only what changed" test uses `contractRequest(schemas.UpdateExampleByIdBody, …)` to validate the payload *shape* against the generated API schema, not just its values — this catches accidental extra fields.
