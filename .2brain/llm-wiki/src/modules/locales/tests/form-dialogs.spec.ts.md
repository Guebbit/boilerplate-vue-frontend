---
source: src/modules/locales/tests/form-dialogs.spec.ts
sha256: bce2c2da25ebede6805a5fcf248d8078cdd68eab47c1bb687131391b0508887c
signature: 4721b5facfcf4615639c42ce5f72d64dbeaeb0332be753a003eecdf5c63d16fa
generated_at: 2026-11-10T04:44:07.549744+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/form-dialogs.spec.ts

## Purpose
Vitest spec covering the two locale form dialogs (`EntryFormDialog`, `LanguageFormDialog`) that their parent component owns the write for. It verifies that the submit button is disabled while the parent's save is in flight (preventing double-submit via click or Enter) and that a 422 refusal naming a specific field is routed onto that field through the dialog's exposed `applyServerErrors` method.

## Key elements

- **`DUPLICATE_KEY`** — A pre-built 422 problem fixture (via `aProblem`) with a single `VALIDATION_ERROR` on the `key` field, used to exercise `applyServerErrors`.
- **`GLOBAL`** — Shared `mount` options: registers Vuetify and i18n plugins, and stubs `VDialog` as a bare `<div><slot/></div>` so dialog content renders regardless of open state.
- **`mountEntryDialog(saving: boolean)`** — Helper that mounts `EntryFormDialog` with `modelValue: true`, a fixed `apps` array, and the `saving` flag; returns a Vue Test Utils wrapper.
- **`describe('EntryFormDialog', …)`** — Three tests: submit disabled while saving, submit enabled otherwise, and `applyServerErrors(DUPLICATE_KEY)` causing the `key` field's error text to appear after `nextTick`.
- **`describe('LanguageFormDialog', …)`** — Two tests: submit disabled while saving, and the `active` toggle present only on the create form (absent on edit, since activation is handled by board-level buttons).

## Relationships

- **`EntryFormDialog.vue` / `LanguageFormDialog.vue`** — The two components under test; mounted directly with props.
- **`tests/support/stub.ts`** — `asStub<T>()` casts the wrapper's `vm` so tests can call `applyServerErrors` with a typed signature rather than reaching into an untyped proxy.
- **`tests/support/unit/fixtures.ts`** — `aProblem(status, errors)` builds the 422 problem object used in the field-error test.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` runs once at module load to inject locale-related Pinia stores / services into the core module registry before any test executes.

## Notes

- The `VDialog` stub is intentional: the real component gates rendering behind its `open` prop, which would leave the form DOM absent. The stub keeps the slot content in the tree so queries like `[data-test=entry-save]` resolve.
- `applyServerErrors` returns a boolean (true when it consumed the error). Tests assert both the return value *and* the resulting DOM text after `nextTick`, because the method mutates reactive state that Vue flushes asynchronously.
- The `active` toggle test encodes a product decision: `active` was removed from PUT/PATCH payloads; a new language picks its initial state in the dialog, while an existing one is toggled by buttons on the board.
