---
source: src/modules/example/tests/example-target-confirm-once.spec.ts
sha256: a72c1dbfd9fecd017eb584aaa7d99d487a70a584f6ca182f98e99f2bf6549f3d
signature: 209308e14ec2bd5a1fd34d0ac1ac01ccf6f57f099662a20aba31c8cda290711d
generated_at: 2026-11-10T04:26:07.062404+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/example-target-confirm-once.spec.ts

## Purpose

Regression test for the `ExampleTarget` delete flow: pressing the delete button twice in rapid succession (before the first confirmation dialog resolves) must produce exactly one confirm prompt and one `deleteExample` call. Exists to guard against a double-fire bug in the component's confirm-then-delete handler.

## Key elements

- **`EXAMPLE`** – A minimal `Example` fixture (id `ex-1`, status `draft`, `actions.delete: true`) used to populate the store and to drive the route param.
- **`router`** – A `createMemoryHistory` router whose single route (`/:locale`) contains `collectModuleRoutes(enabledModules)`, giving the mounted component a real navigation tree.
- **`describe('a double press on the example delete')` / `it('deletes once')`** – The single test case. Mounts `ExampleTarget`, fires two synchronous `click` events via `Promise.all`, flushes microtasks, then asserts `useDialogStore().confirm` and `store.deleteExample` were each called exactly once.
- **`beforeEach`** – Resets Pinia, loads the `en` locale, and pushes the router to `/en/examples/ex-1` so the component finds its record.

## Relationships

- **`src/modules/example/store.ts`** – `useExampleStore` is the SUT's data source; the test spies on `deleteExample` (the action under test) and `watchExample` (silenced to avoid real watcher side-effects).
- **`src/modules/example/views/ExampleTarget.vue`** – The component mounted and driven by the test; the `[data-test=example-delete]` button is the interaction target.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called once at module scope to register example-module routes and stores into the global registry before the router is built.

## Notes

- `wireModulesIntoCore()` runs at **module top-level**, not inside `beforeEach`; it mutates global registry state, so it must be called before `createRouter`/`collectModuleRoutes` are invoked.
- The two clicks are dispatched with `Promise.all([click, click])` to guarantee both fire *before* any `await` in the handler resolves—this is what makes the "double press" scenario real rather than sequential.
- `store.addExampleRecord` is called imperatively (not via an API mock) because the test only needs the record present in the store for the component to render; no network layer is involved.
