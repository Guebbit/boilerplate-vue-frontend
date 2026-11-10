---
source: src/modules/users/views/UserCreate.vue
sha256: a02ab64a71b8b3f0add41f5948194938c25fa6fb8622b75c48861c63b86272bd
signature: a02ab64a71b8b3f0add41f5948194938c25fa6fb8622b75c48861c63b86272bd
generated_at: 2026-11-10T06:10:19.379446+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/views/UserCreate.vue

## Purpose

Renders the "Create User" form page. Collects email, username, optional role, locale, active flag, and an avatar image; validates the input client-side with a Zod schema, then delegates the actual API call (multipart or JSON) to the users store. On success it navigates to the new user's detail page; on failure it surfaces inline blocking errors.

## Key elements

- **`UserCreatePage`** (named component block) — stable name for devtools / `<KeepAlive>`; cannot be set inside `<script setup>`.
- **`createSchema`** — Zod schema built once from `usersSchema.pick({ email, username }).extend({ role, active, locale, imageUpload })`. Messages are i18n thunks resolved at parse time in the active locale.
- **`submitForm`** — validates via `useStructureFormValidation.handleSubmit`, tracks upload progress, calls `createUser`, then either navigates to `UserTarget` or routes the error through `applyServerErrors` / `useBlockingError`.
- **`localeOptions`** — computed array derived from `supportedLanguages`, labelled via the active i18n locale.
- **`useLeaveGuard`** integration — warns the visitor if they navigate away while `isDirty`; `markSaved()` clears the guard after a successful create.
- **`useBlockingError`** (`submitError` / `reportSubmitError` / `clearSubmitError`) — keeps a failed submit's error visible inline next to the submit button instead of a transient toast.

## Relationships

- **`src/modules/users/schemas.ts`** — imports `usersSchema`, picks `email` + `username`, and extends with the remaining fields to form the page-local `createSchema`.
- **`src/modules/users/store.ts`** — imports `useUsersStore`; calls `createUser(payload, { requestOptions })` inside `submitForm`.
- **`src/modules/users/composables/use-role-options.ts`** — imports `useRoleOptions`; reads `grantableRoles()` (to conditionally hide the role select) and `roleOptions()` (select items).
- **`src/modules/users/tests/user-create-view.spec.ts`** — unit/integration spec that exercises this view's form, validation, and submission paths.

## Notes

- **No password field.** The design intent (documented in the module comment) is that the new owner receives an email link to set their own credential; the form displays a note to that effect.
- **Multipart vs. JSON branching** lives in `createUser` in the store, not here. This file only decides whether to attach `requestOptions` via `trackUpload`.
- **`formElement` is a getter** (`() => card.value?.formElement`) so the DOM node is resolved at submit time, not while `FormCard` is still mounting. An ESLint suppression is required because TypeScript-ESLint cannot resolve the template-ref's SFC instance type.
- **Role select is conditionally rendered** (`v-if="grantableRoles().length > 0"`). When the caller has no assignable roles the field disappears entirely.
- **`active` defaults to `true`** in the initial form state, mirroring the API's `CreateUserRequest.active` default, so the switch reflects what an omitted value would produce.
- **Navigation on success is fire-and-forget** (`void router.push(…)`). A `NavigationFailure` is handled globally by `router.onError` and must not convert a completed create into an error toast.
