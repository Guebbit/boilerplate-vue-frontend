# src/modules/locales/tests/entries-import-dialog.spec.ts

## Purpose

Unit tests for the `EntriesImportDialog` component's confirmation-gate logic: verifying that a **replace**-mode import is blocked until the user accepts the confirmation prompt (via the real `useDialogStore`), while a **merge**-mode import emits immediately without any confirmation. The dialog shell (Vuetify `v-dialog`) is stubbed so its slot content renders regardless of open state; the component's own `watch(isOpen, …)` and submit handler are exercised for real.

## Key elements

- **`mountDialog()`** – Mounts `EntriesImportDialog` with Vuetify, i18n, and a `VDialog` stub (`<div><slot /></div>`), then flips `modelValue` to `true` to trigger the open-state watcher. Returns the settled wrapper.
- **`fillForm(wrapper, mode)`** – Sets the JSON textarea to a valid payload and clicks the matching mode radio button.
- **`TENANT`** – A `LocaleTenantDescriptor` fixture (backend kind) passed as the `tenants` prop.
- **`VALID_JSON`** – Minimal import payload (`{"generic":{"error-internal":"Oops"}}`).
- **`describe('a replace-mode import')`** – Two cases: dismissing the confirmation (`store.answer(false)`) yields no `import` emit; accepting (`store.answer(true)`) yields exactly one `import` emit carrying `{ mode: 'replace', tenant: 'demo-be' }`.
- **`describe('a merge-mode import')`** – One case: submit emits `import` immediately with `mode: 'merge'`, and `useDialogStore().queue` is empty (no pending confirmation left in the queue).
- **`beforeEach`** – Resets Pinia (`setActivePinia(createPinia())`) and loads the `en` locale.

## Relationships

- **`tests/support/unit/wire-modules.ts`** – Imported as `wireModulesIntoCore` and invoked once at module top-level before any test runs. This wires application modules into the core so that the component (and its store/i18n dependencies) can resolve their imports under the test runner without a full app bootstrap.

## Notes

- `useDialogStore` is **not** mocked; the tests call `store.answer(true/false)` to simulate the user's confirmation decision, mirroring the contract pinned in `tests/unit/ui/dialog.spec.ts`.
- The replace-accept test requires **two** successive `$nextTick()` calls: the first lands after `confirm()`'s internal promise resolves, the second after `handleImport`'s own `.then()` fires the emit. A single tick is insufficient.
- The merge-mode test explicitly asserts `useDialogStore().queue` is empty — the intent (documented inline) is that putting a confirmation on the safe path would train users to click through the destructive one.
- The `VDialog` stub renders the default slot unconditionally; the component's own `watch(isOpen, …)` still fires because the `v-model` prop is toggled, so `mode` resets to `'merge'` and `tenant` to its default on every open.
