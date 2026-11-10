---
source: src/modules/users/tests/user-access-dialog.spec.ts
sha256: 28e55ad888212ef36d90f6e779d9bf521901219d01fb399676ecd2dc29a4ce48
signature: 8f47a0e908874bc11e37122e9fd9b15be0fbf54501d1243121f31df2dd774b05
generated_at: 2026-11-10T06:08:01.193805+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/user-access-dialog.spec.ts

## Purpose

Unit tests for `UserAccessDialog.vue`. Covers the full picker → confirm interaction flow, the `skipPicker` entry path used by `UserEdit.vue`, the self-deactivation warning, the shape of the emitted `confirm` payload (only changed fields, `null` for "no role"), and which picker controls are enabled/disabled based on the target row's `actions` and the caller's `grantableRoles`.

## Key elements

- **`mountDialog(props)`** — Mounts the component with `modelValue: false`, stubs `VDialog` to a pass-through `<slot />` wrapper, then flips `modelValue` to `true` so the internal `watch(isOpen)` seeds `selectedRole`/`selectedActive`. Returns the opened wrapper.
- **`beforeEach`** — Resets Pinia, sets `grantableRoles` to `['customer','manager','admin']`, and loads the `en` locale.
- **`describe('UserAccessDialog')`** — Core flow: initial picker state with disabled Continue, confirm payload contains only changed fields, skip-picker skips to confirm directly, cancel emits `cancel` only, self-deactivation warning appears/disappears based on viewer identity.
- **`describe('UserAccessDialog — what the picker offers')`** — Verifies role-select and status-switch disabled states driven by `target.actions` (via `ALL_USER_ACTIONS` / `userActionsOf`) and by `grantableRoles` (empty array disables role select; a restricted list limits VSelect `items`).
- **`disabledOf(wrapper, test)`** — Utility that checks whether a `data-test`-keyed Vuetify field carries the `v-input--disabled` class.

## Relationships

- **`src/modules/users/components/UserAccessDialog.vue`** — The component under test; mounted directly via `mount()`.
- **`src/modules/users/composables/use-user-access-dialog.ts`** — Imported **type-only** (`UserAccessDialogRequestOptions`, `UserAccessDialogTarget`) to type the `mountDialog` props.
- **`tests/support/unit/fixtures.ts`** — Provides `ALL_USER_ACTIONS` and `userActionsOf()` to construct realistic `actions` arrays for target fixtures.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module top-level to register DI/wiring before any mount occurs.

## Notes

- The `VDialog` stub (`<div><slot /></div>`) bypasses Vuetify's overlay/portal machinery so the dialog body renders synchronously regardless of `modelValue`; the same technique is used in `entries-import-dialog.spec.ts`.
- The `modelValue` false → true transition in `mountDialog` is deliberate: it triggers the component's `watch(isOpen)` to seed initial `selectedRole`/`selectedActive`, mirroring what `useUserAccessDialog().request()` does in production.
- "No staff role" is emitted as `role: null`, **not** `role: ''`. The skip-picker test for `chosenRole: ''` asserts this normalization explicitly.
- Element queries rely on `data-test` attributes rather than Vuetify-generated classes, except for the `disabledOf` helper which reads `v-input--disabled`.
- The moderator-role test introspects `VSelect` `items` via `findAllComponents({ name: 'VSelect' })` and asserts the exact three-element array (current role included even if not in `grantableRoles`).
