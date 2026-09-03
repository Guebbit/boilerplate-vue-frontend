# src/modules/account/components/ProfileDeleteAccount.vue

## Purpose

A minimal, single-purpose UI widget that renders a "Delete account" button. When clicked it gates the actual API call behind a shared confirm dialog, then delegates the network request to the profile store. It exists to keep the destructive action self-contained and easy to drop into the account settings page without coupling that page to deletion logic.

## Key elements

- **`handleDeleteAccount()`** – The only logic function. Opens a `useDialogStore().confirm()` modal (error-colored, i18n message). On acceptance it calls `requestAccountDelete()` from `useProfileStore()`, shows a success toast on resolve, or routes the error through `notifyErrorMessages(addMessage, error)` for user-facing feedback.
- **Template** – A `<v-divider>` spacer and a single `<v-btn>` (color `error`, variant `tonal`, `block`) bound to `handleDeleteAccount`. No other DOM is produced.
- **i18n keys used** – `profile-page.button-delete-account`, `profile-page.confirm-delete-account`, `profile-page.success-delete-request`.

## Relationships

- **`useProfileStore`** (`@/modules/account/stores/profile.ts`) – Provides `requestAccountDelete`, the actual network call. This component contains no fetch logic itself.
- **`useDialogStore`** (`@/ui/dialog.ts`) – Supplies the reusable confirmation dialog.
- **`useNotificationsStore`** (`@guebbit/vue-toolkit`) – Supplies `addMessage` for toasts.
- **`notifyErrorMessages`** (`@/infrastructure/utils/errors.ts`) – Centralised error-to-toast adapter.
- **`src/infrastructure/utils/logger.ts`** – Indirect dependency; not imported directly by this file, but reachable transitively through the error-handling utilities (`errors.ts`) that `notifyErrorMessages` relies on for structured logging.

## Notes

- The component is intentionally stateless: no local `ref`s, no `onMounted`, no props. All state lives in stores.
- `handleDeleteAccount` returns the promise chain (the dialog's `.then` → store call → toast). If a parent needs to `await` it, the return value is available; otherwise fire-and-forget is fine.
- Because the confirmation dialog is app-global (`useDialogStore`), the same visual/UX behaviour is guaranteed if the button is ever reused elsewhere.
- No unit test or E2E selector is embedded in the file; tests should target the store method `requestAccountDelete` and the i18n keys independently.
