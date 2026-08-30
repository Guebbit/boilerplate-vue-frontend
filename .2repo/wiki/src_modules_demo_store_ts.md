# src/modules/demo/store.ts

## Purpose

A minimal Pinia store (`counter`) that exposes exactly one state ref, one computed getter, one sync action, and one async action. It exists as the worked example that the Playground page and `exampleGuard` use to demonstrate that a store is reachable from their respective scopes.

## Key elements

- **`useDemoStore`** — the sole export. Defined via `defineStore('counter', …)` using Pinia's setup (composition) syntax.
- **`count`** (`ref(0)`) — the single piece of reactive state.
- **`doubleCount`** (`computed`) — getter returning `count * 2`.
- **`increment()`** — sync action; increments `count` by 1.
- **`incrementDelayed()`** — async action; waits 1 s via `setTimeout`, then increments and resolves the promise with the `count` ref. Intended to exercise pending/awaiting UI states.

## Relationships

- **`src/modules.ts`** — parent module barrel; re-exports this store so consumers can import it via the module namespace rather than a deep path.
- **`src/modules/demo/tests/store.spec.ts`** — unit-test suite that exercises `count`, `doubleCount`, `increment`, and `incrementDelayed` against the expectations encoded here.
- **`docs/index.md`** — project documentation that references this store as the canonical example when describing store-reachability guarantees (Playground, `exampleGuard`).
- **`package.json`** — provides the `vue` and `pinia` runtime dependencies this file imports.

## Notes

- The store ID is `'counter'`, not `'demo'`, despite the file living under `modules/demo/`. Tests and any runtime selector lookups must use the ID string `'counter'`.
- `incrementDelayed` returns the **ref itself** (not `count.value`) in its promise resolution. Consumers should be aware they receive a reactive ref, not a plain number.
- The module docblock explicitly scopes this file to "and nothing else" — do not add extra state or actions here; extend a real store instead.
