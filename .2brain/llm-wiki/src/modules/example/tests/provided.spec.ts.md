---
source: src/modules/example/tests/provided.spec.ts
sha256: 29c3b6cdbc6ff1d5fce8571af19e2a86318b0d246a6d6ad2f4c031c9187c18fa
generated_at: 2026-10-17T00:53:29.549107+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/provided.spec.ts

## Purpose

Verifies the provide/inject pair exported by `provided.ts` by mounting a real parent → child component tree. This exercises `provide`/`inject` in their only meaningful context (inside a component instance) and asserts that a descendant receives the *same* ref object and the *same* `changeStatus` function the provider holds, rather than a copy.

## Key elements

- **`childContext`** — Module-level `let` that the child component writes into during `setup`. Persists across tests; each test overwrites it on mount.
- **`Child`** — `defineComponent` that calls `useProvidedExample()` and renders `childContext.example.value?.title`. Defined at top level because a lint rule forbids render functions in nested scopes.
- **`mountPair(provided)`** — Defines a Parent that calls `provideExample(provided)` and renders `Child`, then returns a `@vue/test-utils` wrapper. The Parent is created fresh on each call.
- **`AN_EXAMPLE`** — Minimal `{ id: 'a', title: 'Hello' }` fixture cast to `Example`.
- **`describe('provideExample')`** — Three tests: (1) identity of `example` ref and `changeStatus` function between provider and descendant; (2) mutating the provider's ref propagates to the child after `nextTick`; (3) calling `changeStatus('published')` on the descendant invokes the provider's mock.
- **`describe('providedExampleKey')`** — One test asserting the key is a `Symbol` (prevents string-collision across modules) and that its string form contains `'example:provided'`.

## Relationships

- **`../provided`** (`src/modules/example/provided.ts`) — Source under test. Imports `provideExample`, `providedExampleKey`, `useProvidedExample`, and the `ProvidedExample` type.
- **`@types`** — Imports the `Example` type used by the `AN_EXAMPLE` fixture.
- **`@vue/test-utils` / Vue runtime** — Provides `mount`, `defineComponent`, `h`, `ref`, `nextTick` used to construct the test component tree.
- **Vitest** — `describe`, `it`, `expect`, `vi` drive the test structure and mocking.

## Notes

- Components (`Child`, the inline `Parent`) are defined at module scope, not inside test bodies or helpers, to satisfy a project lint rule about nested render-function scopes.
- `childContext` is shared mutable state at module level; tests are written so each mount overwrites it before assertions, but this is a subtle ordering dependency if tests were ever parallelised within the file.
- The reactivity test relies on the child holding the *ref object* (not a snapshot of `.value`), which is the contract being asserted.
