# src/modules/demo/components/ProvidedVariableCard.vue

## Purpose

The "injecting" half of the Vue `provide`/`inject` demo. It consumes a shared reactive ref (provided by `Playground.vue`) via the `useProvidedVariable` composable, renders two text inputs that mutate the value through different binding styles, and logs every observed change. It exists as a separate component specifically because a component providing to itself would not exercise the cross-boundary mechanism the demo is meant to illustrate.

## Key elements

- **`useProvidedVariable()`** (imported from `@/modules/demo/provided.ts`) — returns the injected pair `{ providedVariable, setProvidedVariable }`.
- **`watch(providedVariable, …)`** — fires on every change to the injected ref; calls `logger.debug('demo', 'Provided ref changed', value)`.
- **Two `<v-text-field>` inputs** in the template — first uses `v-model` (direct ref mutation); second uses `:model-value` + `@update:model-value` calling `setProvidedVariable` explicitly (setter-style mutation). Both feed the same shared ref.
- **`t()`** from `vue-i18n` — resolves all user-facing labels under the `playground-page.label-provided*` keys.

## Relationships

The dependency graph records no neighbors for this file. The code itself imports `useProvidedVariable` from `@/modules/demo/provided.ts` (the providing side) and `logger` from `@/infrastructure/utils/logger.ts`.

## Notes

- The second text field coerces non-string input to `''` before calling `setProvidedVariable` — a guard against `null`/`undefined` from the component's update event.
- The `watch` is diagnostic only (logs to console); the visible reactivity in the template comes from Vue's normal binding, not from the watcher.
- The file is intentionally a standalone SFC rather than a section of `Playground.vue` so the provide/inject boundary is visible to readers of the demo.
