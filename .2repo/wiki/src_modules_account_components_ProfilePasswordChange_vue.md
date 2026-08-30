# src/modules/account/components/ProfilePasswordChange.vue

## Purpose
A collapsible, inline password-change form for the profile page. It exists so the user can prove their current password and set a new one in a single request (no email round-trip), and so it stays hidden behind a toggle to avoid opening the profile page with multiple forms visible simultaneously.

## Key elements
- **Component** (`ProfilePasswordChange`) – registered name; no props or emits.
- **`showChangePassword`** – `ref<boolean>` controlling visibility; the form uses `v-show`, not `v-if`, so state persists across toggles.
- **`passwordForm` / `passwordErrors` / `showPasswordErrors` / `handlePasswordSubmit`** – returned from `useAppForm`, which pairs a reactive form object with a zod schema. Errors are only rendered when `showPasswordErrors` is true (i.e., after a submit attempt).
- **Zod schema** – three fields (`currentPassword`, `password`, `passwordConfirm`). The new-password field reuses `usersPasswordSchema` from `@/modules/users`. A `superRefine` adds a cross-field match check on `passwordConfirm`.
- **`submitPasswordChange`** – calls `handlePasswordSubmit`, which gates on validation, then invokes `changePassword(currentPassword, password, passwordConfirm)` from the profile store. On success it toasts a message, clears all three fields, and collapses the form. On failure it routes the error through `notifyErrorMessages`.
- **`passwordFormId`** – generated via `useId()`; bound to the `<form>` `id` and the toggle button's `aria-controls` for accessibility.
- **`passwordFormElement`** – template ref to the `<form>` element, passed into `useAppForm` so it can focus the first invalid field on submit.

## Relationships
- **`@/modules/account/stores/profile.ts`** – provides `changePassword`, the actual API call.
- **`@/modules/users`** – exports `usersPasswordSchema`, the shared zod schema for new-password validation.
- **`@/infrastructure/composables/use-app-form.ts`** – encapsulates the form-state + zod-parse loop and focus management.
- **`@/infrastructure/utils/errors.ts`** – provides `notifyErrorMessages`, which maps API errors to toast messages via the notifications store.
- **`src/infrastructure/utils/logger.ts`** – transitive dependency (reachable through `useAppForm` or `errors.ts`); no direct import in this file.

## Notes
- The confirm-match check lives in `superRefine`, which runs at parse time. The code comment notes that `t()` inside `superRefine` is already effectively lazy (evaluated when `handleSubmit` triggers a parse), so no extra thunk is needed—unlike the `min(1)` messages which use `error: () => t(...)` thunks.
- The form uses `novalidate` on the `<form>` element; all validation is handled by the zod layer, not native HTML constraints.
- After a successful change the component does **not** reload the profile; it simply clears the three fields and collapses. Any downstream state (e.g., a "password changed" banner) is the parent page's responsibility.
- `data-test` attributes (`toggle-change-password`, `current-password`, `new-password`, `new-password-confirm`, `submit-password-change`) are present for E2E selectors.
