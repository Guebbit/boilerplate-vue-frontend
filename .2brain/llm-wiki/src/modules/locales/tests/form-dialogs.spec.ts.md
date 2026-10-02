---
source: src/modules/locales/tests/form-dialogs.spec.ts
sha256: 2f37a56fcbaa9c3cdb3ea98335bdd91169d7f7596df5405a064e45cc02e2644d
generated_at: 2026-10-02T15:15:09.444665+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/form-dialogs.spec.ts

## Purpose

Unit tests verifying two behavioral contracts of the locale form dialogs (`EntryFormDialog`, `LanguageFormDialog`): the submit button is disabled while the parent's write is in flight (preventing duplicate submits), and a server 422 refusal that names a specific field is surfaced on that field via the dialog's `applyServerErrors` method.

## Key elements

- **`mountEntryDialog(saving: boolean)`** — helper that mounts `EntryFormDialog` with a fixed tenant list and toggles the `saving` prop.
- **`DUPLICATE_KEY`** — a canned 422 response object (with `errors[0].field = 'key'`) used to exercise `applyServerErrors`.
- **`GLOBAL`** — shared Vitest global config: registers Vuetify + i18n plugins and stubs `VDialog` with a pass-through `<slot>` template so dialog content renders without an open state.
- **`beforeEach`** — resets Pinia (`setActivePinia(createPinia())`) and loads the `'en'` locale.
- **`describe('EntryFormDialog')`** — three specs: disabled-while-saving, enabled-when-not-saving, and field-level error surfacing.
- **`describe('LanguageFormDialog')`** — one spec: disabled-while-saving.

## Relationships

- **`tests/support/stub.ts`** — provides `asStub<T>()`, a type-assertion helper used to cast `wrapper.vm` so the test can call `applyServerErrors` without a full component type definition.
- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore()`, called once at module top-level to register the module system so component imports resolve correctly under Vitest.

## Notes

- The `VDialog` stub is a plain template stub (`<div><slot /></div>`), not a full Vuetify mock. This means tests only verify content rendering and prop-driven behavior, not dialog open/close transitions.
- `asStub` is a deliberate escape hatch: the test reaches into the component instance directly rather than simulating a full save round-trip through the parent.
- The `LanguageFormDialog` suite only covers the `saving`-disables-submit contract; the field-error path is exercised only for `EntryFormDialog`.
