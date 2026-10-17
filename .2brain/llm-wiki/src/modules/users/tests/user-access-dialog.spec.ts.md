---
source: src/modules/users/tests/user-access-dialog.spec.ts
sha256: ace311f70624587b0db7653522ad1fb474028d094a881c98d7761e2c40155139
generated_at: 2026-10-17T01:48:04.849012+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/user-access-dialog.spec.ts

## Purpose

Unit tests for `UserAccessDialog.vue`. Validates the two-step picker → confirm flow, the `skipPicker` fast-path used by `UserEdit.vue`, the self-deactivation warning, the emitted payload shape (only changed fields, ready for a `PATCH` body), and which controls are enabled/disabled based on the target user's `actions` and the caller's `grantableRoles`.

## Key elements

- **`mountDialog(props)`** – Mounts the dialog with `modelValue: false`, then sets it to `true` to replicate the `watch(isOpen)` transition that seeds `selectedRole`/`selectedActive`. Stubs Vuetify's `VDialog` with a bare `<div><slot /></div>` so content renders in both states.
- **`disabledOf(wrapper, test)`** – Helper that checks whether a Vuetify field behind a `data-test` attribute carries the `v-input--disabled` class.
- **`beforeEach`** – Creates a fresh Pinia store, sets `grantableRoles` to `['customer','manager','admin']`, and loads the `en` locale.
- **`describe('UserAccessDialog')`** – Core flow tests: picker starts disabled, confirm emits only changed fields, skip-picker mode omits the picker step and "back" button, cancel emits only `cancel`, self-deactivation warning appears only when the target is the signed-in viewer.
- **`describe('UserAccessDialog — what the picker offers')`** – Matrix of `actions` (`update`, `ban`) and `grantableRoles` to verify which controls are enabled/disabled and what role options the select presents.

## Relationships

- **`src/modules/users/components/UserAccessDialog.vue`** – The component under test; mounted directly via `@vue/test-utils`.
- **`src/modules/users/composables/use-user-access-dialog.ts`** – Imported for the `UserAccessDialogTarget` and `UserAccessDialogRequestOptions` types only (type-level dependency; the composable itself is not exercised).
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module top-level (before `beforeEach`) to register i18n translation modules with the core i18n instance that `UserAccessDialog.vue` consumes.

## Notes

- The `VDialog` stub technique (render a bare slot wrapper) is the same pattern used in `entries-import-dialog.spec.ts`; it lets assertions target inner content without fighting Vuetify's teleported/overlay DOM.
- `wireModulesIntoCore()` runs once at import time, not per-test — if a future test needs a different locale or module set, the call must be refactored.
- The "moderator-like caller" test reaches into the rendered `VSelect` component instance to inspect its `items` prop, coupling the assertion to Vuetify's component name rather than a `data-test` attribute.
- Self-warning tests mutate `useSessionStore().viewer` inside individual `it` blocks rather than in `beforeEach`, so each test is responsible for setting (or not setting) the viewer it needs.
