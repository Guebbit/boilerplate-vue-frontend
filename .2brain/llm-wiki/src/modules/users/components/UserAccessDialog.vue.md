---
source: src/modules/users/components/UserAccessDialog.vue
sha256: e525f624ef53fbeb9b14a767dd048f0af0cd22f68c935f2bbb0e612a83a80cc0
generated_at: 2026-10-17T01:45:36.767129+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/components/UserAccessDialog.vue

## Purpose
A two-step admin dialog (pick → confirm) for changing a target user's role and/or active status. It exists to centralise the access-control mutation behind a confirm gate that names the target, warns about deactivation consequences, and—when the target is the signed-in admin—adds a specific self-deactivation warning. One component serves two entry patterns: the list/detail "choose new values" flow and `UserEdit.vue`'s already-collected "confirm only" flow.

## Key elements
- **`props.target` / `props.options`** — identity of the affected user and the request context (`skipPicker`, `chosenRole`, `chosenActive`). Both are `undefined` while the dialog is closed.
- **`defineModel<boolean>` (`isOpen`)** — two-way visibility binding; the parent controls open/close.
- **`step` ref (`'pick' | 'confirm'`)** — current panel. Starts at `'confirm'` when `options.skipPicker` is set.
- **`watch(isOpen, …)`** — re-seeds `selectedRole` / `selectedActive` from `options` or `target` and sets the initial `step` every time the dialog opens (not on mount, since one instance is shared across list rows).
- **`canPickRole` / `canPickActive`** — computed gates: role picker requires `actions.update`, not-self, and at least one grantable role; active toggle requires `actions.ban`.
- **`hasChanges`** — disables the "Continue" button until at least one field differs from the loaded value.
- **`isDeactivating` / `isSelf`** — drive confirm-step copy, the extra self-warning alert, and flip the confirm button to `color="error"`.
- **`summaryLines`** — ordered list of one translation string per changed field, rendered in the confirm panel.
- **`goToConfirm` / `handleConfirm` / `handleCancel`** — step transitions. `handleConfirm` emits `confirm` with *only* the fields that changed (unchanged fields are `undefined`), ready to spread into a `PATCH` body. `handleCancel` closes the dialog and emits `cancel`.
- **`useRoleOptions()`** — supplies the server-provided list of assignable roles and the `roleOptions()` formatter.
- **`useFullscreenDialog()` / `useReturnFocus()`** — UI utilities for responsive sizing and focus restoration.
- **`useSessionStore()`** — provides the signed-in admin's id for the `isSelf` comparison.

## Relationships
- **`use-user-access-dialog.ts`** — source of the imported types (`UserAccessDialogRequestOptions`, `UserAccessDialogResult`, `UserAccessDialogTarget`) and the composable that wraps this component's `confirm`/`cancel` events into an awaitable promise.
- **`use-role-options.ts`** — imported for `grantableRoles` and `roleOptions`, which populate the role select and gate `canPickRole`.
- **`UserEdit.vue`** — opens this dialog with `options.skipPicker: true` after its own form has already collected the new values; the dialog then runs only the confirm step.
- **`UsersList.vue` / `User.vue`** — open this dialog with `skipPicker` unset (the default "pick" flow) from row actions or the detail-page action button.
- **`user-access-dialog.spec.ts`** — unit tests for this component's two-step flow, permission gating, and self-deactivation warning.
- **`user-edit-view.spec.ts`** — integration tests covering the `skipPicker` path through `UserEdit.vue`.

## Notes
- **Changed-fields-only payload.** `handleConfirm` intentionally omits unchanged fields (`undefined`) so an unmodified `role` is *not* re-sent; re-sending it would trigger the backend's grant-check even though nothing changed.
- **Shared instance.** The `watch(isOpen, …)` pattern (rather than a `watchEffect` or mount hook) exists because a single dialog instance is reused across every rendered list row; values are re-seeded on each open.
- **Permission defaults.** Both `canPickRole` and `canPickActive` fall back to `true` when the corresponding `actions` key is absent (`?? true`), so a missing permission object does not accidentally lock the dialog.
- **Self-role lock.** `canPickRole` is always `false` when `isSelf` is true, regardless of `actions.update`; the server also refuses a self-role change, but the UI hides the picker entirely.
