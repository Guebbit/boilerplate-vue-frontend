---
source: src/modules/locales/tests/entries-import-dialog.spec.ts
sha256: b39c34bdae4504a29efc80e1cea8d6a14592c7d746d0831ac24ea0eff375b391
generated_at: 2026-10-02T15:14:54.660299+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/entries-import-dialog.spec.ts

## Purpose

Vitest spec for `EntriesImportDialog.vue`. Verifies the two import paths (merge vs. replace) by exercising the component's own confirmation gate — `useDialogStore().answer()` — rather than Vuetify's overlay. The dialog shell is stubbed so the component's script runs synchronously in the test DOM.

## Key elements

- **`mountDialog()`** — Mounts the dialog with `modelValue: false`, then flips it to `true` via `setProps`, replicating the real "user opens dialog" transition that triggers the component's `watch(isOpen)` reset of `mode`/`tenant`. Returns the opened wrapper.
- **`fillForm(wrapper, mode)`** — Sets the JSON textarea to a valid payload and clicks the matching mode radio.
- **`TENANT` / `VALID_JSON`** — Fixed test fixtures: a single `backend`-kind tenant descriptor and a one-key locale JSON string.
- **`describe('a replace-mode import')`** — Two cases: dismissing the confirmation emits nothing; accepting it emits `import` once with `{ mode: 'replace', tenant }`.
- **`describe('a merge-mode import')`** — Single case: submit emits `import` immediately with `mode: 'merge'` and leaves the dialog-store queue empty.
- **`wireModulesIntoCore()`** — Called at module scope to register the module graph the component expects.

## Relationships

- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore`, invoked once at import time so the component's module imports resolve in the test environment.
- **`tests/support/unit/mounted-vm.ts`** — Provides `nextRenderTick`, used after `store.answer()` and after the component's internal `.then()` chain to let Vue flush renders before asserting on emitted events.

## Notes

- **VDialog stub is load-bearing.** Replacing `<VDialog>` with a plain `<div><slot/></div>` means the component's slot content is always in the DOM. Without this, the confirmation logic (which lives in the component script, not Vuetify's overlay) would never execute.
- **Two `nextRenderTick` calls in the accept test.** The `confirm()` promise resolves (tick 1), then `handleImport`'s own `.then` emits (tick 2). A single tick lands *between* those, not after both.
- **Merge path asserts an empty queue.** The test explicitly checks `useDialogStore().queue` has length 0 after a merge submit — a guard against a regression where a stale confirmation prompt lingers and later fires on the dangerous path.
- **`useDialogStore` is the real store** (created fresh in `beforeEach`), not a mock. The test relies on the same `answer()` contract pinned by `tests/unit/ui/dialog.spec.ts`.
