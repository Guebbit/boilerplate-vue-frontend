---
source: src/modules/users/components/UserAccessDialog.vue
sha256: facccab7cad8f464cfd55f9c7f18a66b6bf01ecd0091070377dda9c4bf1c30bc
signature: d34235c868267d7117f724de91224cd527637a490277c6e27ed2b99637d66411
generated_at: 2026-11-10T06:02:53.734393+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/components/UserAccessDialog.vue

## Purpose

A two-step admin dialog (pick → confirm) for changing another user's role and/or active status. It gates destructive changes behind a confirm panel that names the target and warns about the logout consequences of deactivation. It exists so that both the users-list row action and the detail-page action share one UI, while `UserEdit.vue` can reuse only the confirm step after its own form has already collected values.

## Key elements

- **Props** — `target` (the `UserAccessDialogTarget` with name, role, active, id, and allowed `actions`) and `options` (e.g. `skipPicker`, `chosenRole`, `chosenActive`). Both are `undefined` while closed.
- **`isOpen`** (`defineModel<boolean>`) — v-model controlling visibility; wired into `DialogShell`.
- **`step`** — `'pick' | 'confirm'`; determines which panel renders. Seeded to `'confirm'` when `options.skipPicker` is set.
- **`selectedRole` / `selectedActive`** — reactive form fields, re-seeded via `watch(isOpen)` on every open (not on mount, since one instance is reused across list rows).
- **`canPickRole` / `canPickActive`** — computed guards driven by the target's `actions.assignRole` / `actions.deactivate` / `actions.activate` and by whether the caller holds at least one grantable role.
- **`isDeactivating` / `isSelf`** — computed flags that drive confirm-copy, button colour (`error` vs `primary`), and the extra self-deactivation warning.
- **`summaryLines`** — ordered list of changed-field descriptions rendered in the confirm panel.
- **`handleConfirm`** — emits `confirm` with *only* the fields that differ (unchanged fields are `undefined`), mapping the select's `''` to the API's `null` for "no role".
- **`handleCancel`** — closes the dialog and emits `cancel`.
- **`goToConfirm`** — guard that prevents advancing when nothing changed.

## Relationships

- **`src/modules/users/composables/use-user-access-dialog.ts`** — the primary consumer. It owns the promise lifecycle: it opens the dialog, awaits the `confirm`/`cancel` emits, and resolves/rejects the caller's `await`. This component is the "plain `v-model`" side of that contract.
- **`src/modules/users/composables/use-role-options.ts`** — provides `grantableRoles()` (used for the `canPickRole` gate) and `roleOptions(currentRole)` (populates the `v-select` items).
- **`src/modules/users/views/UserEdit.vue`** — passes `options.skipPicker: true` along with pre-filled `chosenRole`/`chosenActive`, so only the confirm panel renders (the "Back" button is hidden).
- **`src/modules/users/views/UsersList.vue`** — row action opens the dialog with the default picker flow (pick → confirm).
- **`src/modules/users/views/UserTarget.vue`** — detail-page action; opens the dialog in the same picker flow as the list.
- **`src/modules/users/tests/user-access-dialog.spec.ts`** — unit tests for this component's render, step transitions, and emitted payloads.
- **`src/modules/users/tests/user-edit-view.spec.ts`** — integration tests exercising the confirm-only flow through `UserEdit.vue`.
- **`src/modules/users/tests/user-target-view.spec.ts`** — integration tests exercising the picker flow through `UserTarget.vue`.

## Notes

- **Re-seed on open, not on mount.** The `watch(isOpen)` is intentional: a single component instance is shared across every row a `UsersList` renders. Resetting in `onMounted` would be too late for subsequent opens.
- **Partial-payload contract.** `handleConfirm` sends `undefined` for unchanged fields. Callers must forward only the defined keys to the API; sending an unchanged role triggers a `409 USER_ROLE_ALREADY_ASSIGNED`.
- **`''` → `null` mapping.** The role `v-select` uses an empty string for "no role"; the API contract expects `null`. The conversion happens once, in `handleConfirm`.
- **`actions` defaults to `true`.** Both `canPickRole` and `canPickActive` fall back to `true` when the target's `actions` object omits the relevant key, so a missing field does not silently lock the UI.
- **`skipPicker` hides the Back button.** In the confirm panel, the "Back" button is conditionally rendered only when `options.skipPicker` is falsy, preventing a dead-end navigation.
