---
source: src/modules/users/views/UserCreate.vue
sha256: 9e73f1ea373bb5ea00f19ca4fd03b80a535eb63573014bfd054b50d61615c4e1
generated_at: 2026-10-02T15:52:33.635537+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/views/UserCreate.vue

## Purpose

Renders the user-creation form. It collects email, username, password (or a "send setup email" checkbox in its place), role, locale, active flag, and an optional avatar, validates the submission client-side via a Zod schema, and delegates the actual `POST` (multipart or JSON) to the users store.

## Key elements

- **`UserCreatePage`** (component name) — the SFC's identity for DevTools and the router.
- **`UserCreateForm`** — local interface describing the form's bound fields; used as the generic parameter for `useStructureFormValidation`.
- **`createSchema`** — Zod schema built by `usersSchema.pick({email,username}).extend({...}).superRefine(...)`. The `superRefine` enforces "password XOR sendSetupEmail" and, when a password *is* present, re-runs `usersPasswordSchema`'s strength checks so those rules stay declared in one place.
- **`submitForm`** — top-level action: clears any prior blocking error, calls `handleSubmit` (from the shared composable) which in turn calls `createUser` from `useUsersStore`, tracks upload progress via `useAxiosUploadProgress`, toasts success, and navigates to `UserTarget`. API failures are mapped through `applyServerErrors`; unmapped errors are surfaced as an inline `InlineErrorAlert`.
- **`localeOptions`** (computed) — maps `supportedLanguages` to `{value, title}` pairs, translated into the active UI locale.
- **`useBlockingError`** hook — provides `submitError` / `reportSubmitError` / `clearSubmitError` so a failed create renders an inline alert next to the submit button instead of a dismissible toast.

## Relationships

- **`src/modules/users/store`** (`useUsersStore`) — provides `createUser`, which owns the multipart-vs-JSON branch and the HTTP call. This view only assembles the payload.
- **`src/modules/users/schemas.ts`** — supplies `usersSchema` (email/username fields) and `usersPasswordSchema` (strength rules) that `createSchema` composes.
- **`src/modules/users/domain`** — supplies `userRoleOptions`, the single source of role choices shared by every role select in the module.
- **`src/infrastructure/utils/uploads.ts`** — supplies `imageUploadSchema` used for the avatar field's validation.
- **`src/infrastructure/utils/use-blocking-error.ts`** — composable backing the inline submit-error display.
- **`@guebbit/vue-toolkit`** — provides `useStructureFormValidation` (form state, submit, server-error mapping) and `useNotificationsStore` (toast dispatch).

The listed graph neighbors `src/infrastructure/utils/logger.ts` and `src/modules/account/views/TwoFactorChallenge.vue` are **not imported or referenced** in this file; no direct interaction exists.

## Notes

- **Password is intentionally a plain `z.string().optional()`**, not `usersPasswordSchema` directly. The `superRefine` only applies strength rules when a password was actually typed *and* `sendSetupEmail` is off. This avoids a false "password required" error when the setup-email path is chosen.
- On submit, `password` is coerced to `undefined` when `sendSetupEmail` is true, so an empty string is never sent to the API.
- `formElement` is passed as a **getter** (`() => card.value?.formElement`) because the `<form>` lives inside `FormCard` and may not be mounted when the composable config is evaluated.
- `revalidateOn: locale` causes schema messages (which use `translate()` thunks) to re-resolve when the UI language changes.
- The post-success `router.push` is wrapped in `void` so a Vue Router `NavigationFailure` (e.g. duplicate navigation) does not reject the promise and get misread as a create failure.
- `role` options come exclusively from `domain/roles.ts` (`userRoleOptions`); do not hard-code a second list here.
- `localeOptions` picks up any language added via `GET /locales` at boot with no code change — same mechanism as `Profile.vue`'s language select.
