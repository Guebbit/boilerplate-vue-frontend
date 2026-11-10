---
source: src/modules/example/tests/example-create-view.spec.ts
sha256: e5eee5ca172f541dd9e0826908885b6d1b471757b8865c82dd475c53096c47bb
signature: cccf568d248e1c8e8ed52f863de57fbbf99d4d93ebdaac4bf1bbb6ee4479be05
generated_at: 2026-11-10T04:25:14.774333+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/example-create-view.spec.ts

## Purpose

Vitest suite that mounts the real `ExampleCreate` page against a real (memory-history) router and the real Pinia store, then verifies: client-side validation blocks empty fields before any call, the exact payload sent on success, the post-create redirect, and how server-side refusals (field-level vs. generic) surface in the UI. The HTTP layer is intentionally out of scope; only the store method is spied.

## Key elements

- **`CREATED`** – A fully typed `Example` object (matching the generated contract) used as the mock resolve value. Adding a required field to the type causes a compile error here, acting as a contract canary.
- **`router`** – A `createRouter` with `createMemoryHistory` and routes built from `collectModuleRoutes(enabledModules)`. Shared across all tests so the success redirect is a genuine navigation.
- **`mountPage()`** – Mounts `ExampleCreate` with the store spy installed *before* mount (the view destructures `createExample` during `setup`). Returns `{ wrapper, create }`.
- **`fillAndSubmit(wrapper, title, body)`** – Types into the `[data-test=example-title]` input and `[data-test=example-body]` textarea via `setValue`, triggers form submit, and flushes promises.
- **`beforeEach`** – Resets Pinia, clears `document.body`, loads the `en` locale, and navigates the shared router to `/en/examples/create`.
- **Test cases (4)**:
  - Empty title → `create` not called; Vuetify `.v-messages` shown on the title field.
  - Valid submit → `create` called with `{ title, body }`; router ends at `/en/examples/ex-1` (asserted via `vi.waitFor`).
  - 422 with `field: 'body'` → message rendered under the body field; route unchanged.
  - 500 generic → `[data-test=example-create-error]` element appears; route unchanged.

## Relationships

- **`src/modules/example/store.ts`** – `useExampleStore().createExample` is the unit boundary. It is mocked in every test case; the store's own HTTP calls are exercised in a separate suite.
- **`src/modules/example/views/ExampleCreate.vue`** – The component under test; imported directly and mounted with no intermediate wrapper.
- **`tests/support/unit/fixtures.ts`** – Provides `aProblem(status, errors[])` to build realistic Problem-details rejection objects used by the 422 and 500 tests.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` registers enabled modules with the kernel registry so `collectModuleRoutes` and i18n keys resolve during mount.

## Notes

- The spy is attached **before** `mount`, because the view destructures the store method during `setup`. Attaching it after mount would leave the real method bound.
- The success test uses `vi.waitFor` (a polling loop) rather than a single `flushPromises` to tolerate the router's async navigation; a fixed number of flushes is fragile here.
- `attachTo: document.body` is required so Vuetify's `.v-messages` portal renders into the DOM where `wrapper.find` can locate it.
- The `LayoutDefault` stub prevents the real layout from mounting, keeping the test focused on the form while still exercising router navigation.
