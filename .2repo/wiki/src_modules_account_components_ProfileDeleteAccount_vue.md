# src/modules/account/components/ProfileDeleteAccount.vue

## Purpose

A single-button Vue component that triggers the account-deletion flow. It wraps the `requestAccountDelete` store call behind a shared confirmation dialog and surfaces the result (success toast or error toast) via the notifications store. It exists to isolate the destructive action so the parent profile page doesn't need to own the confirmation/error-handling logic.

## Key elements

- **`handleDeleteAccount()`** — Entry point (bound to the button click). Opens the app-wide confirmation dialog; on acceptance, calls `requestAccountDelete()` from the profile store, then pushes a success or error toast.
- **Template** — A `v-divider` and a full-width, error-colored `v-btn` (Vuetonic tonal variant) labeled via i18n key `profile-page.button-delete-account`.
- **`useDialogStore().confirm()`** — Shared dialog utility; returns a promise that resolves `true`/`false` for accept/deny.
- **`notifyErrorMessages(addMessage, error)`** — Imported from `@/infrastructure/utils/errors.ts`; formats and dispatches error notifications.
- **i18n keys used** — `profile-page.confirm-delete-account`, `profile-page.success-delete-request`, `profile-page.button-delete-account`.

## Relationships

- **`src/infrastructure/utils/logger.ts`** (graph neighbor) — Not imported directly by this file. The interaction is indirect: `notifyErrorMessages` (from `errors.ts`) routes error output through the shared logger, so this component's failure path ultimately feeds into the logging pipeline.
- **`useProfileStore`** — Consumes `requestAccountDelete` (the actual API call lives there).
- **`useDialogStore`** — Consumes the shared confirmation dialog for the destructive-action gate.
- **`useNotificationsStore`** — Consumes `addMessage` for toast feedback (both success and error paths).

## Notes

- The component has **no props, no emits, no local state**. It is a pure action trigger; all reactive data lives in the stores it calls.
- If the user clicks "deny" in the confirmation dialog, `handleDeleteAccount` resolves with no side effects (no toast, no API call).
- The success path does **not** navigate away or redirect; the toast is the only feedback the user gets after the confirm step.
- Error handling is delegated entirely to `notifyErrorMessages`; there is no local `try/catch` or per-error-code branching here.
