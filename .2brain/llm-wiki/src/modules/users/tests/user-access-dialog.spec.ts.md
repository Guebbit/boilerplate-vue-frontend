---
source: src/modules/users/tests/user-access-dialog.spec.ts
sha256: 2fd10a7205ef36264b1b1ded0c4fb19141d059358ad49ae3d04335595db4d48f
generated_at: 2026-10-02T15:48:55.659675+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/user-access-dialog.spec.ts

## Purpose

Vitest spec for `UserAccessDialog.vue`. Validates the two-step picker → confirm flow, the `skipPicker` shortcut mode used by `UserEdit.vue`, the self-deactivation warning, and that the emitted `confirm` payload contains only the fields that actually changed (unchanged fields are `undefined`), ready to serve as a `PATCH` body.

## Key elements

- **`mountDialog(props)`** — Mount helper that stubs Vuetify's `VDialog` as `<div><slot/></div>` so the dialog body renders regardless of open state, then flips `modelValue` to `true` to trigger the internal `watch(isOpen, …)` that seeds `selectedRole` / `selectedActive`.
- **`beforeEach`** — Creates a fresh Pinia instance and loads the `en` locale.
- **`wireModulesIntoCore()`** — Called once at module top-level (from `tests/support/unit/wire-modules.ts`) to register the module-level DI wiring before any test runs.
- **Test cases** (under `describe('UserAccessDialog')`):
  - Picker step renders and Continue stays disabled until a value changes.
  - Changing only `active` and confirming emits `{ role: undefined, active: false }`.
  - `skipPicker: true` + chosen values skips the picker step entirely (no Back button).
  - Skip-picker confirm emits the caller-chosen role with `active: undefined` when unchanged.
  - Cancel emits `cancel` and never emits `confirm`.
  - Self-deactivation (target `id` matches `useSessionStore().viewer.id`) shows `[data-test=user-access-self-warning]`.
  - Same deactivation on a different user shows no warning.

## Relationships

- **`tests/support/unit/wire-modules.ts`** — Imports and calls `wireModulesIntoCore()` at the top of the module so that any store or service resolved through the app's module registry is available before the first test mounts the component.
- **`@/modules/users/components/UserAccessDialog.vue`** — The component under test; all assertions target its rendered DOM and emitted events.
- **`@/infrastructure/session.ts`** — `useSessionStore()` is used to set `viewer` for the self-deactivation warning tests.
- **`@/modules/users/composables/use-user-access-dialog.ts`** — Source of the `UserAccessDialogTarget` and `UserAccessDialogRequestOptions` types that shape the `mountDialog` helper and the `options` prop.

## Notes

- `VDialog` is stubbed with a bare slot-forwarding div; the dialog's open/closed state is irrelevant to rendering. The real open transition is simulated by `setProps({ modelValue: true })`, which drives the same `watch` the production `useUserAccessDialog().request()` call would.
- Element selectors use `data-test` attributes (`user-access-role`, `user-access-continue`, `user-access-confirm`, `user-access-cancel`, `user-access-active`, `user-access-back`, `user-access-self-warning`), not Vuetify class names — keep these in sync if the template changes.
- The confirm payload contract: unchanged fields are present in the object with an `undefined` value (not omitted). This is what makes the object directly usable as a `PATCH` body where the backend ignores `undefined` keys.
- The `skipPicker` mode has **no** Back button by design; a test explicitly asserts its absence.
