---
source: src/modules/example/provided.ts
sha256: 13b72b361e359b31512ad4cec329fc502c172b481657ab41d47fe1b2b2655e91
signature: 92218a847c4e26428ea04997f92475e8190953d566f91d339caa9497c7330768
generated_at: 2026-11-10T04:22:53.501042+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/provided.ts

## Purpose

Defines a typed Vue provide/inject pair that passes the current `Example` (read-only) and a single `changeStatus` mutation down a screen's component tree. It exists so descendants never need prop-drilling to reach the screen's data or to request a lifecycle event, and so a rename on either side is a compile error.

## Key elements

- **`ProvidedExample`** (interface) — the shape handed down: `example: Ref<Example | undefined>` (read-only to descendants) and `changeStatus: (event: ExampleEvent) => Promise<unknown>` (the only mutation a descendant may request).
- **`providedExampleKey`** (`InjectionKey<ProvidedExample>`) — a `Symbol`-based key that carries the value's type, eliminating magic strings and making `inject` type-safe without an explicit generic.
- **`provideExample(provided)`** — thin wrapper around Vue's `provide`; call from the screen-level component.
- **`useProvidedExample()`** — thin wrapper around Vue's `inject`; returns the pair with a non-null assertion because a missing provider is a wiring bug, not a runtime state.

## Relationships

- **`src/modules/example/store.ts`** — provides the `ExampleEvent` type that types the `changeStatus` parameter. This is the sole cross-file type dependency of this module.
- **`src/modules/example/views/ExampleEdit.vue`** / **`src/modules/example/views/ExampleTarget.vue`** — graph neighbors on the *provider* side (they call `provideExample` so their subtree can inject).
- **`src/modules/example/components/ExampleStatusActions.vue`** — graph neighbor on the *consumer* side (it calls `useProvidedExample` to read `example` and to fire `changeStatus`).
- **`src/modules/example/tests/provided.spec.ts`** — unit-tests the provide/inject contract defined here.
- **`src/modules/example/tests/example-status-actions.spec.ts`** — tests the consumer component; exercises the provided pair through `ExampleStatusActions.vue`.

## Notes

- `example` is intentionally a `Ref` so a screen can swap the value (e.g. after a save) without re-providing; descendants see the update reactively.
- The non-null assertion in `useProvidedExample` (`inject(...)!`) is deliberate: the only caller is guaranteed to render under a provider. If you add a second, independent consumer, remove the `!` and add a `throw` for a clearer error.
- The file has no side effects at module scope (the `Symbol` is the only value created on import). It is safe to import in tests without a component tree.
