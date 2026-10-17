---
source: src/modules/example/provided.ts
sha256: e5584e0349be652f03e1399e463206341a93ece32633243148f9a1db34c09541
generated_at: 2026-10-17T00:51:12.972443+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/provided.ts

## Purpose

Defines a typed Vue provide/inject contract so a parent screen can hand its `Example` and a single status-mutation callback to descendant components without prop-drilling. The pair is exchanged through a `Symbol`-based `InjectionKey`, giving full type inference on the `inject` side.

## Key elements

- **`ProvidedExample`** (interface) — the shape of the contract: `example: Ref<Example | undefined>` (read-only to descendants) and `changeStatus: (status: ExampleStatus) => Promise<unknown>` (the one mutation a descendant may request).
- **`providedExampleKey`** — `InjectionKey<ProvidedExample>` backed by `Symbol('example:provided')`; the sole lookup key for the pair.
- **`provideExample(provided)`** — thin wrapper around `provide(providedExampleKey, provided)`; called by the owning parent component.
- **`useProvidedExample()`** — thin wrapper around `inject(providedExampleKey)!`; the non-null assertion documents the invariant that the caller always renders under a `provideExample` ancestor.

## Relationships

- **`ExampleTarget.vue`** — the expected provider: calls `provideExample` to publish the `Example` and `changeStatus` to its subtree.
- **`ExampleStatusActions.vue`** — the expected consumer: calls `useProvidedExample` to read the example and invoke `changeStatus`.
- **`provided.spec.ts`** — unit tests covering the key, `provideExample`, and `useProvidedExample` behavior.
- **`example-status-actions.spec.ts`** — component tests that exercise the consumer side of the contract.

## Notes

- `useProvidedExample` uses a non-null assertion (`!`). A `null` return is treated as a wiring error (the caller must be mounted under a `provideExample` ancestor), not a runtime condition to handle gracefully.
- The `example` ref is intentionally `undefined`-able while loading; consumers must guard for that state.
- All mutations (and any resulting toast/error reporting) are funnelled through the single `changeStatus` callback the provider supplies—descendants never mutate the `Example` ref directly.
