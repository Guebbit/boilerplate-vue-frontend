---
source: src/modules/locales/tests/entries-import-dialog.spec.ts
sha256: 115a27f88accfb283f72bdd87517d412306fa4bb01726c131fc53d5e5f5e07e6
signature: db6eff3892dad02a27975f7c2f8a95eae418f8af7b2f006ce53f1c5395936d2a
generated_at: 2026-11-10T04:43:55.417102+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/entries-import-dialog.spec.ts

## Purpose

Unit-test spec for `EntriesImportDialog.vue`. It verifies the component's import submission logic across three scenarios: replace-mode with confirm/decline, duplicate-key detection after flattening, and merge-mode (which skips confirmation entirely). It stubs Vuetify's `v-dialog` overlay so the dialog's content renders without managing open/close state, while letting the real `useDialogStore` drive the confirmation gate.

## Key elements

- **`mountDialog()`** — Mounts the dialog with `modelValue: false`, Vuetify + i18n plugins, and a `VDialog` stub that renders the slot unconditionally. Then flips `modelValue` to `true` so the component's `watch(isOpen, …)` resets `mode`/`app` defaults, mirroring a real open transition.
- **`fillForm(wrapper, mode)`** — Sets the textarea (`[data-test=import-json]`) to a valid JSON payload and clicks the radio for the given mode (`merge` | `replace`).
- **`APP`** — A `LocaleAppDescriptor` fixture (`id: 'demo-be'`, kind `backend`) used as the single element of the `apps` prop.
- **`VALID_JSON`** — Stringified `{ generic: { 'error-internal': 'Oops' } }`, a well-formed import payload.
- **`describe('a replace-mode import')`** — Two tests: dismissing the confirmation emits nothing; accepting it emits `import` once with `{ mode: 'replace', app: APP.id }`.
- **`describe('a dictionary that names one key twice once flattened')`** — Submits `{ 'a.b': 'x', a: { b: 'y' } }` and asserts the error message names the key and no `import` event fires.
- **`describe('a merge-mode import')`** — Asserts `import` emits immediately with `mode: 'merge'` and that `useDialogStore().queue` is empty (no confirmation left pending).
- **`beforeEach`** — Resets Pinia (`setActivePinia(createPinia())`) and loads the `en` locale via `loadLocale`.

## Relationships

- **`src/modules/locales/components/EntriesImportDialog.vue`** — The component under test; the spec mounts it, triggers form submission, and inspects its emitted `import` events.
- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore()`, called once at module load to register locale-related modules in the core runtime before any test runs.
- **`tests/support/unit/mounted-vm.ts`** — Provides `nextRenderTick(wrapper)`, a Promise-based helper used to wait one (or two) render cycles after async store interactions before asserting on emitted events.

## Notes

- The `VDialog` stub (`<div><slot /></div>`) means the component's content is always in the DOM; the spec controls "open" purely via `modelValue` to exercise the `watch(isOpen, …)` reset logic.
- In the accept-path test, two consecutive `nextRenderTick` calls are required: one for `confirm()`'s promise to resolve, a second for `handleImport`'s own `.then()` to emit. A single `$nextTick` would land between the two microtasks, not after both.
- The merge-mode test deliberately asserts `useDialogStore().queue` has length 0, guarding against an accidental `confirm()` call that would leave a stale prompt in the queue.
- `wireModulesIntoCore()` is invoked at the top of the module (not inside `beforeEach`), so it runs once for the entire spec file.
