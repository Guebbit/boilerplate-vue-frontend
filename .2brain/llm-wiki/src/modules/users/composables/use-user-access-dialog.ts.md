---
source: src/modules/users/composables/use-user-access-dialog.ts
sha256: 39f6d08afcf8d95573bad8e1c0fa6747dd0d52bd37cdcb05b5de17d0835ce54d
signature: f0f2a17977bee72106f3ccec0fe41df413046ee783d93a116ee0ed0bd009f42e
generated_at: 2026-11-10T06:03:55.358258+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/composables/use-user-access-dialog.ts

## Purpose

Promise-based composable wrapper around `UserAccessDialog.vue` that lets callers await the admin's decision the same way they await `useDialogStore().confirm()` (`request(...).then(result => …)`), instead of each wiring their own open flag and resolver. The dialog component itself stays a plain `v-model` component (the module's usual pattern, cf. `LanguageFormDialog.vue`); this composable is the shared layer consumed by three call sites.

## Key elements

- **`UserAccessDialogTarget`** (interface) — describes the user the dialog acts on: `id`, `name`, current `role`, `active` state, and optional `actions` (server-answered permissions). Absent `actions` reads as "everything allowed."
- **`UserAccessDialogRequestOptions`** (interface) — per-invocation options: `skipPicker` (skip the role/status picker) plus `chosenRole` / `chosenActive` for callers that already collected those values (e.g. `UserEdit.vue`).
- **`UserAccessDialogResult`** (interface) — the admin's decision; each field present only when it differs from the loaded value. `role: null` means "remove the staff role" (the dialog's "none" option).
- **`useUserAccessDialog()`** (composable, the sole function export) — returns:
  - `isOpen`, `target`, `options` — reactive refs to bind onto `<UserAccessDialog>`.
  - `request(target, options?)` — opens the dialog and returns a `Promise<UserAccessDialogResult | undefined>`.
  - `confirm(result)` / `cancel()` — settle the pending promise and close the dialog.

## Relationships

- **`UserAccessDialog.vue`** — the component this composable drives. The composable supplies `isOpen`, `target`, and `options` as template bindings, and `confirm`/`cancel` as event handlers on the dialog's emitted events.
- **`UsersList.vue`**, **`UserTarget.vue`**, **`UserEdit.vue`** — the three call sites. `UserEdit.vue` additionally uses `skipPicker` with pre-collected `chosenRole`/`chosenActive` because its own form already gathered those values.
- **`user-access-dialog.spec.ts`** — unit tests exercising this composable and the dialog.

## Notes

- The promise returned by `request()` **never rejects**; cancellation resolves with `undefined`, mirroring the `useDialogStore().confirm()` contract. Callers should handle the `undefined` case.
- `role` in the result is `string | null` — `null` is the sentinel for "remove role" and is distinct from the field being absent (unchanged).
- `actions` on the target is optional; when omitted the dialog assumes all permissions (`assignRole`, `activate`, `deactivate`) are available.
- `settle` is a module-local `let`, not a ref, because it holds a one-shot resolver and is reset to `undefined` after each invocation — it is intentionally not reactive.
