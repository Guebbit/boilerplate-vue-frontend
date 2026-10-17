---
source: src/modules/example/tests/example-status-actions.spec.ts
sha256: 049789c155759a7d1ccbc855b1512ecd75f9e906d79eaee74720b633c55d224e
generated_at: 2026-10-17T00:53:09.636791+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/example-status-actions.spec.ts

## Purpose

Vitest spec for the `ExampleStatusActions` component. It verifies two contracts: (1) the component renders only the status transitions legal for the current status, and (2) clicking a move button delegates the mutation to the injected provider (`changeStatus`) rather than calling the store directly.

## Key elements

- **`mountUnder(status, changeStatus?)`** — Builds a throwaway `defineComponent` provider that calls `provideExample` with a ref (or `undefined` for the loading case) and renders `ExampleStatusActions` inside it. Returns a promise resolving to the mounted wrapper.
- **`offered(wrapper)`** — Collects every `[data-test^=example-move-]` attribute on the rendered DOM, giving the list of transitions the component currently offers.
- **`describe('ExampleStatusActions')` block** — Three tests:
  - *Parameterised* (`it.each`): `draft → [published, archived]`, `published → [archived]`, `archived → [draft]`.
  - Loading case: `status = undefined` yields an empty list.
  - Delegation case: clicks `example-move-published` and asserts `changeStatus` was called with `'published'`.

## Relationships

- **`src/modules/example/components/ExampleStatusActions.vue`** — The SUT; imported and rendered by `mountUnder`.
- **`src/modules/example/provided.ts`** — Supplies `provideExample`, which the test provider uses to inject the mock example and `changeStatus` into the component tree.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is invoked at module scope to register DI bindings so the component resolves its dependencies in the test environment.

## Notes

- All tests are **promise-based** (`loadLocale('en').then(…)`); they return the promise and Vitest awaits it. No `await` syntax appears.
- The `data-test` attribute prefix (`example-move-*`) is the selector contract; renaming those attributes in the component will break this spec without a compile-time error.
- `changeStatus` defaults to `vi.fn().mockResolvedValue(undefined)`, so the loading/draft/published/archived tests don't assert on calls—only the last test does.
- The module-level JSDoc explicitly states the intent: the component "asks the provider, never the store." Any future refactor that bypasses `changeStatus` violates the contract this spec guards.
