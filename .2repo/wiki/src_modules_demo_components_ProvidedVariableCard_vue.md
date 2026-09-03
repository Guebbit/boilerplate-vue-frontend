# src/modules/demo/components/ProvidedVariableCard.vue

## Purpose

The consuming (injecting) half of the provide/inject demo. It pulls a shared ref via `useProvidedVariable`, displays the current value, and offers two text inputs that mutate the value through different mechanisms. It exists as a separate component (rather than inline markup in `Playground.vue`) because provide/inject only becomes observable when the value crosses a component boundary.

## Key elements

- **`useProvidedVariable()`** — imported from `@/modules/demo/provided.ts`; returns `{ providedVariable, setProvidedVariable }`. `providedVariable` is a reactive ref; `setProvidedVariable` is an explicit setter.
- **`watch(providedVariable, …)`** — logs every observed change via `logger.debug('demo', 'Provided ref changed', value)`.
- **Template – `v-text-field` (v-model)** — binds directly to `providedVariable`, demonstrating the ref-as-two-way-binding pattern.
- **Template – `v-text-field` (`:model-value` + `@update:model-value`)** — reads from `providedVariable` but writes through `setProvidedVariable(…)`, demonstrating the explicit-setter pattern. Includes a `typeof value === 'string'` guard.
- **`useI18n().t`** — resolves all visible labels from the `playground-page` translation namespace.
- **Vuetify `v-card`** — wraps the UI; fixed width (`max-w-md`).

## Relationships

No graph neighbors are recorded for this file. It imports `useProvidedVariable` (provided by `Playground.vue` via Vue's `provide`) and the project-level `logger` utility.

## Notes

- The two text fields are intentionally redundant: they exist to contrast `v-model` on a ref versus calling a named setter. They are not two independent features.
- The component must be a *child* of whatever calls `provide`. Rendering it in isolation (no provider in the ancestor chain) will throw at `useProvidedVariable()`.
- The `typeof value === 'string' ? value : ''` guard on the second field handles Vuetify's `update:model-value` potentially emitting `undefined` on clear; the first field (`v-model`) does not need this guard because Vue's ref assignment handles it.
