# src/modules/demo/views/Playground.vue

## Purpose

A single-page demo/showroom that exercises the project's core infrastructure in one readable view: the Pinia counter store, the `provide/inject` pattern, the toast notification store, and sequential fake loading states. It is intentionally un-abstracted so a reader can trace each mechanism end-to-end without following indirections.

## Key elements

- **`testAddMessage()`** – calls `useNotificationsStore().addMessage` with a timestamped string to demonstrate the toast pipeline.
- **Fake loading sequence** – top-level `setTimeout` chain calls `useCoreStore().setLoading('core' | 'usersList', …)` with debug log lines; no reactive trigger, purely illustrative.
- **Counter wiring** – destructures `count` and `doubleCount` via `storeToRefs(useDemoStore())` for template reactivity; `increment` / `incrementDelayed` are called directly from the store instance.
- **`provideVariable()`** – imported from `@/modules/demo/provided.ts`; establishes the provide-side scope for `ProvidedVariableCard` (the inject-side child rendered in the template).
- **`onMounted` / creation log** – two `logger.debug('demo', …)` calls marking component lifecycle for the demo's logging showcase.
- **Template** – `LayoutDefault` wrapper with three `<section>` blocks: counter stats + inputs, `ProvidedVariableCard`, and the toast trigger button. Uses `useI18n().t()` for all user-facing strings.

## Relationships

- **`src/modules.ts`** – registers this view as the `playground-page` route within the demo module's route table, making it reachable at its demo URL.
- **`src/modules/demo/guards.ts`** – provides the route guard(s) that gate access to the demo module's routes, including this page.

## Notes

- The `<script>` (non-setup) block exists solely to set the component `name` to `'PlaygroundPage'` for devtools; all logic lives in `<script setup>`.
- The fake-loading `setTimeout` chain executes **at module-evaluation time** (top-level of `<script setup>`), not inside a lifecycle hook—re-mounting the component will re-run it.
- `count` is two-way bound to `FormCounterInput` via `v-model`; because it comes from `storeToRefs`, writing to it mutates the store directly (no local copy).
- `provideVariable()` scopes to this component and all its descendants; it does **not** leak to sibling routes or parent layouts.
