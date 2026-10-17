---
source: src/modules/locales/tests/form-dialogs.spec.ts
sha256: bbd1e1cde9846ebdc64ca098f93fdf28ee170fe223e07a422f6a84c2501cde69
generated_at: 2026-10-17T01:05:40.173725+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/form-dialogs.spec.ts

## Purpose

Unit tests for the two locale form dialogs (`EntryFormDialog`, `LanguageFormDialog`) that verify two parent-owned-write contracts: the submit button is disabled while a save is in flight, and a server refusal that names a specific field is surfaced on that field via the dialog's exposed `applyServerErrors` method.

## Key elements

- **`DUPLICATE_KEY`** – Fixture object modelling a `422` response whose `errors[0].field` is `"key"`; used to exercise `applyServerErrors`.
- **`GLOBAL`** – Shared `mount` options: real `vuetify` and `i18n` plugins, plus a `VDialog` stub (`<div><slot/></div>`) so dialog content renders regardless of open state.
- **`beforeEach`** – Resets Pinia and loads the `'en'` locale before every test.
- **`mountEntryDialog(saving)`** – Convenience wrapper that mounts `EntryFormDialog` open with a fixed `apps` prop and the `saving` flag.
- **`describe('EntryFormDialog')`** – Three assertions: submit disabled while saving, submit enabled otherwise, and `applyServerErrors(DUPLICATE_KEY)` places the message on `[data-test=entry-key]`.
- **`describe('LanguageFormDialog')`** – One assertion: submit disabled while `saving` is `true`.

## Relationships

- **`EntryFormDialog.vue`** – Primary subject; tests mount it and inspect its `[data-test=entry-save]` button and `[data-test=entry-key]` field, and call its exposed `applyServerErrors`.
- **`LanguageFormDialog.vue`** – Secondary subject; tests mount it and inspect `[data-test=language-save]`.
- **`tests/support/stub.ts`** – Provides `asStub<T>()`, used to type-cast `wrapper.vm` so the test can call `applyServerErrors` without a full component type.
- **`tests/support/unit/wire-modules.ts`** – Provides `wireModulesIntoCore()`, called once at module scope to register module Pinia stores so the dialogs can read/write reactive state.

## Notes

- `VDialog` is stubbed to a plain slot-forwarding `div`; the real Vuetify dialog wrapper is never exercised.
- `asStub` is a test-only cast—it does **not** validate that the method exists at runtime; a typo in the method name would fail with a runtime error, not a type error.
- The `saving` prop is the sole signal for disabling submit; the dialogs do not manage their own async save, so no `vi.spyOn` on store actions is needed.
