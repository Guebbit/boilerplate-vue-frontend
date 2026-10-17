---
source: src/modules/example/tests/example-edit-view.spec.ts
sha256: 40a054ffda07936fb2bb3f3cffb623faa94e9fcc284d41254dbf47e6ab37c7df
generated_at: 2026-10-17T00:52:48.894083+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/example-edit-view.spec.ts

## Purpose

Integration test that mounts the real `ExampleEdit` page against a real memory-history router and a seeded Pinia store (spies, not HTTP mocks). It verifies that the form opens pre-filled from the cached record, sends only changed fields as a merge, omits the cover upload when no image is selected, blocks invalid input client-side, and surfaces an API error in-place.

## Key elements

- **`EXAMPLE`** — fixed `Example` record (`id: 'ex-1'`) shared by every test case.
- **`router`** — memory-history router built from `collectModuleRoutes(enabledModules)`; used as the real routing context for the mounted component.
- **`mountPage()`** — helper that (1) seeds the store cache via `store.addExampleRecord`, (2) spies on `watchExample`, `updateExample`, and `setCover`, (3) sets `store.selectedExampleId`, (4) mounts `ExampleEdit` with `props: { id }`, Vuetify, i18n, and a stubbed `LayoutDefault`. Returns `{ wrapper, update, cover }`.
- **Test cases (under `describe('ExampleEdit')`)**:
  - *opens filled from the cached record* — asserts title/body inputs are pre-populated.
  - *sends only what changed, as a merge* — asserts `updateExample` is called once with a payload that passes `contractRequest` against `schemas.UpdateExampleByIdBody` containing only `{ title: 'Renamed' }`.
  - *sends no cover request when no image was picked* — asserts `setCover` is never called.
  - *refuses an emptied title, and sends nothing* — asserts `updateExample` is not called and a Vuetify message appears.
  - *blocks the form in place when the API refuses the save* — asserts the `[data-test=example-edit-form-error]` element exists after a rejected `updateExample`.

## Relationships

- **`src/modules/example/views/ExampleEdit.vue`** — the system under test; imported and mounted directly.
- **`src/modules/example/store.ts`** — `useExampleStore` is imported; its methods (`addExampleRecord`, `watchExample`, `updateExample`, `setCover`) and state (`selectedExampleId`) are the seam at which the test injects fakes.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is invoked at module top-level to register module routes/state before any test runs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — `contractRequest` validates the shape of the update payload against the generated `@api/schemas` contract, replacing a hand-written expected object.

## Notes

- `wireModulesIntoCore()` runs once at import time (not in `beforeEach`); it is idempotent by design but this file relies on that.
- `watchExample` is spied with `vi.fn() as never` to suppress any real watcher side-effects without affecting the other spies.
- `attachTo: document.body` plus `document.body.innerHTML = ''` in `beforeEach` is required for Vuetify's overlay/portal rendering; removing it will cause silent assertion failures on form messages.
- The cover-upload flow is asserted by *absence* (`setCover` not called) rather than by a positive upload test; there is no separate test that exercises a successful cover request in this file.
