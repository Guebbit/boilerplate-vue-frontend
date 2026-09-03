# src/modules/demo/store.ts

## Purpose

A minimal Pinia setup store that demonstrates state, a getter, a sync action, and an async action. It exists as the canonical worked example referenced by the Playground page and `exampleGuard` to prove a store is reachable from their respective scopes.

## Key elements

- **`useDemoStore`** — exported Pinia setup store, registered under the id `'counter'`. Returns the four members below.
- **`count`** (`ref<number>`) — the counter state, initialised to `0`.
- **`doubleCount`** (`computed<number>`) — getter that returns `count * 2`.
- **`increment()`** — sync action; increments `count` by 1.
- **`incrementDelayed()`** — async action; increments `count` after a 1 s `setTimeout`, returns a `Promise` that resolves with the `count` ref.

## Relationships

- **`src/modules/demo/tests/store.spec.ts`** — unit-test suite for this store; imports `useDemoStore` and exercises its state, getter, and both actions.

## Notes

- The store's Pinia id is `'counter'` while the export is named `useDemoStore`. Lookups by id must use `'counter'`, not the function name.
- `incrementDelayed` relies on a real 1 s `setTimeout`; tests must mock timers or await the full delay to observe the increment.
- The file intentionally contains nothing beyond these four members. Do not extend it with unrelated logic — it is a scoped demo, not a feature store.
