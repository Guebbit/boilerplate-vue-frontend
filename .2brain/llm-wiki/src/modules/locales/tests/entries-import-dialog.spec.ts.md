---
source: src/modules/locales/tests/entries-import-dialog.spec.ts
sha256: bfb4eb87562cd7817832cd792f5859c976b64ed3900f75c04d1bab61d3a34b1e
generated_at: 2026-10-17T01:05:29.920561+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/entries-import-dialog.spec.ts

## Purpose

Unit-test spec for `EntriesImportDialog.vue` that verifies the import-confirmation flow: replace-mode submits must pass through the shared dialog-store confirmation gate before emitting, while merge-mode submits emit immediately with no confirmation. Vuetify's `v-dialog` overlay is stubbed away so the component's own script logic (the confirmation gate) is what's exercised.

## Key elements

- **`APP`** – A `LocaleAppDescriptor` fixture (`demo-be`, `backend` kind) used as the target app in every test.
- **`VALID_JSON`** – A well-formed import payload string (`{ generic: { "error-internal": "Oops" } }`) pasted into the form.
- **`mountDialog()`** – Mounts the dialog closed with `VDialog` stubbed to a plain slot-rendering `<div>`, then flips `modelValue` to `true` so the component's `watch(isOpen, …)` reset fires. Returns the wrapper after the async prop-set.
- **`fillForm(wrapper, mode)`** – Sets the textarea value to `VALID_JSON` and selects the `merge` or `replace` radio input.
- **`describe('a replace-mode import')`** – Two cases: dismissing the confirmation emits nothing; accepting it emits `import` exactly once with `{ mode: 'replace', app: APP.id }`.
- **`describe('a merge-mode import')`** – One case: submit emits `import` immediately with `{ mode: 'merge' }` and the dialog-store queue is empty (no confirmation was enqueued).
- **`beforeEach`** – Resets Pinia and loads the `'en'` locale.

## Relationships

- **`src/modules/locales/components/EntriesImportDialog.vue`** – The component under test; imported directly and mounted.
- **`tests/support/unit/mounted-vm.ts`** – Supplies `nextRenderTick`, the async-render-wait helper used to let the component's promise chain (confirm → emit) settle before assertions.
- **`tests/support/unit/wire-modules.ts`** – Supplies `wireModulesIntoCore`, called once at module top-level to register locale-app modules so the component's internal lookups resolve.

## Notes

- **VDialog is stubbed**, not mocked. The real overlay behavior (open/close animation, focus trapping) is intentionally out of scope; the confirmation gate lives in the component's script, not in Vuetify's dialog machinery.
- **`useDialogStore` runs for real** (Pinia is active). Tests drive the confirmation by calling `store.answer(true/false)` directly, mirroring how the shared `tests/unit/ui/dialog.spec.ts` contract works.
- **Replace-mode accept requires two `nextRenderTick` calls** after `answer(true)`: one for `confirm()`'s promise to resolve, a second for `handleImport`'s `.then()` to emit. A single tick is insufficient.
- **`wireModulesIntoCore()` is called at import time** (top-level), not inside `beforeEach`, so it runs exactly once per test file load.
- The merge-mode test asserts the dialog queue is empty, guarding against a regression where a confirmation is silently enqueued on the safe path.
