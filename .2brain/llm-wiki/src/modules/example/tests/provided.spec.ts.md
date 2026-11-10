---
source: src/modules/example/tests/provided.spec.ts
sha256: 161701ab3d062f162e3186f64fe8b0b3764d3a5834cc0ac27c0fa6a50709da2c
signature: a3104cbd7d36fb4a19a0900a94b99b43f976b856918dcc62f3e06257aa659c85
generated_at: 2026-11-10T04:26:34.278062+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/provided.spec.ts

## Purpose

Vitest suite that exercises the `provideExample` / `useProvidedExample` pair end-to-end by mounting a real parent/child component tree. It verifies that a descendant receives the *same* ref and the *same* function reference the provider holds, and that mutations propagate reactively across the boundary.

## Key elements

- **`childContext`** – Module-level `let` that captures the `ProvidedExample` the child component receives via `useProvidedExample()`. Lives at module scope because the components must too (see Notes).
- **`Child`** – A `defineComponent` one level below the provider; calls `useProvidedExample()` in `setup` and renders the example's title.
- **`mountPair(provided)`** – Helper that defines a one-off `Parent` calling `provideExample(provided)` in `setup`, renders `Child` inside it, and returns a `mount` wrapper.
- **`AN_EXAMPLE`** – Minimal `{ id, title }` fixture cast to `Example` for the tests.
- **`describe('provideExample')`** – Three tests: identity of the ref & mutation, reactive write-through on ref reassignment, and that a descendant can invoke `changeStatus` without touching the ref.
- **`describe('providedExampleKey')`** – One test asserting the key is a `Symbol` (not a string) and its description contains `example:provided`.

## Relationships

- **`src/modules/example/provided.ts`** – The unit under test. This file imports `provideExample`, `useProvidedExample`, the `providedExampleKey` symbol, and the `ProvidedExample` type from it. All assertions target the contract that module exposes.

## Notes

- Components (`Child`, the inline `Parent`) are defined at module level or as top-level `const`s, **not** inside a helper function. A render function in a nested scope triggers a lint error; the module-level `childContext` variable exists solely to bridge data out of the component closure.
- The tests mount a real tree instead of calling `provide`/`inject` directly because those APIs only resolve within a component instance—there is no standalone invocation to unit-test.
- `childContext` is mutable shared state across the `describe` block; each test overwrites it via a fresh `mountPair` call. Tests that assert on it must run after their respective mount.
