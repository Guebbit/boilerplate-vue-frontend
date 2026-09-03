# src/modules/demo/provided.ts

## Purpose
Demonstrates Vue's typed `provide`/`inject` pattern using a `Symbol`-based `InjectionKey` instead of a magic string. The state and its mutation live in this file (not the composition root) so that deleting `src/modules/demo` removes the feature cleanly, fulfilling the module-isolation contract described in `src/modules.ts`.

## Key elements
- **`ProvidedVariable`** (type alias) — the payload type; a `string`.
- **`ProvidedVariableMutation`** (type alias) — signature for the setter: `(value?: string) => void`.
- **`ProvidedVariableContext`** (interface) — the pair a descendant receives: a `Ref` plus its mutation function.
- **`providedVariableKey`** (const) — `InjectionKey<ProvidedVariableContext>` backed by `Symbol('demo:providedVariable')`; carries the value's type so `inject` needs no annotation and renames are compile errors.
- **`provideVariable()`** — creates the ref (default `'From the Playground'`) and its mutation, calls `provide(providedVariableKey, …)`, and returns the same pair for the providing component's own use.
- **`useProvidedVariable()`** — calls `inject(providedVariableKey)!` and returns the pair. The non-null assertion is safe because the single consumer is guaranteed to render under a `provideVariable()` ancestor; a missing provider throws Vue's own `TypeError` on destructure.

## Relationships
No dependency-graph neighbors are recorded for this file. It imports only from `vue` and is consumed (per its own docstring) by a single view component within the `demo` module that calls `provideVariable()` in setup.

## Notes
- The mutation wrapper exists specifically so descendants **never** assign to the injected `Ref` directly; they call `setProvidedVariable` instead.
- The default for `setProvidedVariable` is `''` (empty string), not the initial `'From the Playground'` value — calling the mutation with no argument clears the ref.
- The `!` in `useProvidedVariable` is intentional and documented: it is a wiring invariant, not a defensive guard. If the invariant breaks, the failure mode is Vue's generic destructure `TypeError`, not a custom demo message.
