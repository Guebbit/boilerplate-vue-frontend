---
source: src/modules/example/tests/example-published-view.spec.ts
sha256: d53cc1b62fc09e129b3cb771ca6842bf162b15ba1eb35d43b094de53fa938c04
signature: 3de72fc74a2922458625945f99c28d5682fd77c98e3041495f0079c6f0ca2ba5
generated_at: 2026-11-10T04:25:41.335691+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/example-published-view.spec.ts

## Purpose

Unit tests for the `ExamplePublished` view. Verifies that the page renders a published example (title, body, owner), redirects the visitor to the shell's Error page when the store's public read resolves to a 404, and displays nothing while the data is still in flight.

## Key elements

- **`router`** – Memory-history router scoped to `enabledModules`, with a stub `Error` route (`<i />`) so the 404 redirect has a landing target.
- **`PUBLISHED`** – A fully-populated `Example` fixture (`id: 'ex-1'`, `status: 'published'`, `ownerName: 'ada'`) used by every case.
- **`mountPage(answer)`** – Spies on `useExampleStore().fetchPublished` *before* mounting, so the view's immediate read sees the mock. Returns the test wrapper and the spy.
- **`beforeEach`** – Creates a fresh Pinia instance, clears `document.body`, loads the `en` locale, then navigates to `/en/examples/published/ex-1` and waits for router readiness.
- **Three test cases** – "shows the example", "sends the visitor to the Error page when the server answers 404", and "shows nothing of the example while it loads".

## Relationships

- **`src/modules/example/store.ts`** – `useExampleStore` is imported and its `fetchPublished` method is spied/mocked in every case; the store is the sole data source the view reads.
- **`src/modules/example/views/ExamplePublished.vue`** – The component under test; mounted directly with the `id` prop.
- **`tests/support/unit/fixtures.ts`** – Provides `aProblem(404, …)` used to build the 404 rejection envelope.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope so `collectModuleRoutes(enabledModules)` can resolve the example module's route records into the test router.

## Notes

- The 404 rejection is constructed as `Object.assign(new Error('Not Found'), aProblem(404, …))`. The `Error` wrapper satisfies the lint rule that rejection reasons must be `Error` instances, while the spread `status`/`errors` fields are what the view actually reads.
- `wireModulesIntoCore()` runs once at import time, not inside `beforeEach`, because it mutates a shared registry.
- The `fetchPublished` spy is set *before* `mount(…)`; the view calls it synchronously in `setup`, so ordering matters.
