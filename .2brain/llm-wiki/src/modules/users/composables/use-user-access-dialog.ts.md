---
source: src/modules/users/composables/use-user-access-dialog.ts
sha256: 2bd6825c0c8ddd753ed8136c7d29abaa676917bd54f26d653b1eb6a0a9690861
generated_at: 2026-10-17T01:45:54.855137+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/composables/use-user-access-dialog.ts

## Purpose

Promise wrapper around `UserAccessDialog.vue` that lets callers `request(...).then((result) => ...)` the way they already await `useDialogStore().confirm()`, instead of each wiring their own open flag and resolver. It exists so that the three call sites (`UsersList.vue`, `User.vue`, `UserEdit.vue`) share one implementation rather than each re-implementing the open/resolve dance.

## Key elements

- **`UserAccessDialogTarget`** — interface describing the user the dialog acts on (`id`, `name`, loaded `role`/`active`, and optional `actions` restricting which controls the dialog shows). Absent `actions` is treated as "all allowed."
- **`UserAccessDialogRequestOptions`** — options for a `request()` call: `skipPicker` to suppress the role/active picker, plus `chosenRole`/`chosenActive` for values already collected by the caller (used by `UserEdit.vue`).
- **`UserAccessDialogResult`** — the admin's decision; only fields that *differ* from the target's loaded values are present, ready to spread directly into a `PATCH /users/{id}` body.
- **`useUserAccessDialog()`** — the composable. Returns reactive `isOpen`, `target`, `options` (for template binding on `<UserAccessDialog>`), a `request(target, options?)` method that opens the dialog and returns a `Promise<UserAccessDialogResult | undefined>`, and `confirm(result)` / `cancel()` handlers to wire onto the dialog's own events.

## Relationships

- **`UserAccessDialog.vue`** — the component this composable drives. The composable supplies `isOpen`/`target`/`options` as v-bind props and expects the component to emit events that `confirm`/`cancel` handle.
- **`UsersList.vue`**, **`User.vue`**, **`UserEdit.vue`** — the three call sites that invoke `useUserAccessDialog()`. `UserEdit.vue` specifically passes `skipPicker: true` with pre-collected `chosenRole`/`chosenActive`.
- **`user-access-dialog.spec.ts`** — test suite covering the dialog's behavior (and by extension this composable's contract).

## Notes

- The returned promise **never rejects**; it resolves with the changed fields or `undefined` on cancel, mirroring `useDialogStore().confirm()`.
- `UserAccessDialog.vue` itself remains a plain `v-model` component (the module's usual pattern, cf. `LanguageFormDialog.vue`); all promise logic lives in this composable.
- `actions` on the target is server-derived per-row: the dialog shows the role picker only when `update` is present and the active toggle only when `ban` is present.
