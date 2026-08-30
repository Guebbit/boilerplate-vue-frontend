# src/modules/users/views/UserCreate.vue

## Purpose
Vue 3 SFC (named `UserCreatePage`) that renders a user-creation form. It composes `useAppForm` for state/validation, delegates the actual create call to the users store (which branches between multipart and JSON based on whether an avatar is attached), and navigates to the new user's detail page on success.

## Key elements
- **`UserCreateForm`** — local `interface` describing the form shape: `email`, `username`, `password`, `admin`, `active`, `imageUpload`.
- **`createSchema`** — Zod schema built once from `usersSchema.pick({ email, username })` extended with `usersPasswordSchema`, optional booleans, and `imageUploadSchema`.
- **`card`** — template ref to `FormCard`; read lazily via a getter (`formElement`) so the `<form>` DOM node is resolved at submit time, not during mount.
- **`handleSubmit` / `submitForm`** — wires `trackUpload` → `createUser` → success toast + `router.push` to `UserTarget`, with `.catch` feeding `notifyErrorMessages`.
- **`useUploadProgress`** — exposes `uploadProgress` and `trackUpload`; the progress value is passed to `FormImageUpload` so the user sees avatar upload state during the multipart request.
- **Template** — `LayoutDefault` → `FormCard` containing Vuetify text fields, `FormImageUpload`, and two `v-switch` toggles (admin / active).

## Relationships
- **`useUsersStore` → `createUser`** — the actual API call (multipart vs JSON decision) lives in the store, not here.
- **`useAppForm`** — shared composable providing `form`, `formErrors`, `showFormErrors`, `isSubmitting`, `handleSubmit`.
- **`FormCard` / `FormImageUpload` / `LayoutDefault`** — presentation components consumed in the template.
- **`notifyErrorMessages`** — maps rejection reasons to toast messages via the notifications store.
- **`src/infrastructure/utils/logger.ts`** — listed as a graph neighbor but no direct import or call is visible in this file; the connection is likely indirect (e.g., through the store or `useAppForm`).

## Notes
- The `formElement` option passed to `useAppForm` is a **getter**, not a static ref — this is intentional so the element is looked up at the moment a failed submit needs to scroll/highlight, avoiding a race with `FormCard` still mounting.
- The navigation after a successful create uses `void router.push(…)` so a `NavigationFailure` (e.g., user already left) does **not** turn a completed create into an error toast.
- `imageUpload` is optional; when absent the store sends JSON instead of multipart. This branch is invisible here — read the users store to confirm.
- The component is registered with `name: 'UserCreatePage'` in a separate non-setup `<script>` block (required for HMR/devtools alongside `<script setup>`).
