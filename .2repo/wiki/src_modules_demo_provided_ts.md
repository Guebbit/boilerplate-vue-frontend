# src/modules/demo/provided.ts

## Purpose

A self-contained Vue 3 provide/inject demo that illustrates typed dependency injection using a `Symbol`-backed `InjectionKey`. It exists to show the mechanism (a ref paired with a mutation function passed down the component tree) in a form that is trivially deletable with `rm -rf src/modules/demo`.

## Key elements

- **`ProvidedVariable`** (type) — the payload type; a plain `string`.
- **`ProvidedVariableMutation`** (type) — signature for the setter function, preventing descendants from writing to the ref directly.
- **`ProvidedVariableContext`** (interface) — the object descendants actually receive: `{ providedVariable, setProvidedVariable }`.
- **`providedVariableKey`** (exported const) — an `InjectionKey<ProvidedVariableContext>` backed by `Symbol('demo:providedVariable')`; the single source of truth for both `provide` and `inject`.
- **`provideVariable()`** (exported function) — creates the ref (initial value `'From the Playground'`) and its setter, calls `provide()`, and returns the pair so the providing component can use it directly.
- **`useProvidedVariable()`** (exported function) — calls `inject(providedVariableKey)!` and returns the pair; the non-null assertion assumes the caller is always under a `provideVariable()` ancestor.

## Relationships

No project-internal dependencies. The only import is from the `vue` package. No other file in the dependency graph is linked to this module.

## Notes

- The file is intentionally placed inside `src/modules/demo/` (not the composition root) so that deleting the module directory removes all of its state in one step, as `src/modules.ts` promises for every module.
- `useProvidedVariable` relies on Vue's built-in `TypeError` when `inject` returns `undefined` and the destructure is attempted — there is no custom guard or demo-specific error message.
- The mutation function defaults the argument to `''`, so calling `setProvidedVariable()` with no argument clears the value rather than setting it to `undefined`.
