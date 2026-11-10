---
source: src/modules/example/tests/examples-list-view.spec.ts
sha256: 0d667fa93587eb746bacbe12fbe5089cc3b4e0fc26e7b76b8e4c2d53c3c6a134
signature: 58e4789615febf264f16256880770ca265280b4e3e2f9abd98ff4d2d3f163a66
generated_at: 2026-11-10T04:26:18.895843+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/examples-list-view.spec.ts

## Purpose

Vitest spec that verifies the **ExamplesList** page performs server-side sorting: clicking a sortable column header issues a new `listExamples` request with `sort` set, while columns the contract does not name remain inert. Only the API client call is mocked; the store, search, and pagination pipeline run for real, and assertions target the outgoing request parameters.

## Key elements

- **`vi.mock('@api', …)`** — replaces `listExamples` with a `vi.fn()` while preserving all other exports from the API module.
- **`router`** (module-level) — a real Vue Router instance with memory history, whose route tree is built from `collectModuleRoutes(enabledModules)`. Scoped to `/:locale` with nested module routes.
- **`mounted`** — an array of mounted wrappers; `afterEach` unmounts every entry to prevent cross-test DOM leakage.
- **`mountList()`** — mounts `ExamplesList` with `router`, `vuetify`, and `i18n` plugins, flushes promises, and registers the wrapper for teardown.
- **`beforeEach`** — clears storage, resets Pinia, clears all mocks, sets a default empty-list response via `contractResponse`/`asStub`, loads the `en` locale, and navigates to `/en/examples`.
- **`describe('ExamplesList — sorting on the server')`**
  - *"sends a header click as the sort…"* — clicks the "Title" header, asserts `listExamples` was called with `sort: ['title']`, and checks Vuetify sortable/inert CSS classes on "Title" vs "Owner".
  - *"sends no sort until one is chosen"* — asserts the first (initial) call has `sort` undefined.

## Relationships

- **`src/modules/example/views/ExamplesList.vue`** — the SUT; imported and mounted directly. The test exercises its header-click → search interaction.
- **`tests/support/stub.ts`** — provides `asStub<T>()`, used to type-cast the mock return value without losing generic inference.
- **`tests/support/unit/orval-fixture-schema.ts`** — provides `contractResponse()`, which builds a fixture object that satisfies the generated `ListExamplesResponse` schema.
- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore()`, called at module top-level to register the example module into the core module registry before any test runs.

## Notes

- The module-level JSDoc explicitly states the design contract: `listExamples` is the **single** mocked boundary; everything between the UI and that call (store, search composable, page logic) is real.
- `wireModulesIntoCore()` runs once at import time, not inside `beforeEach`—it mutates a shared registry and must not be repeated.
- Tests assert on `listExamples` call arguments (`toHaveBeenLastCalledWith` / `mock.calls`) rather than on rendered DOM content, keeping them decoupled from Vuetify markup details.
- The `mounted` array + `afterEach` unmount pattern is used because `@vue/test-utils` does not auto-cleanup in this setup; forgetting to push a wrapper here would leak DOM nodes into subsequent tests.
