# src/modules/account/views/Profile.vue

## Purpose

The account profile page. It renders a single edit form (username, email, phone, website, preferred language) and composes sibling panels — role, password change, delete account, active sessions, and addresses — each of which manages its own store slice. The page owns only the "user-owned fields" save flow and the post-save language re-entry.

## Key elements

- **`ProfileForm` interface** – Shape of the editable record. All fields nullable (mirrors how the store delivers them, not the API contract).
- **`useAppForm<ProfileForm>`** – Provides `form`, `validate`, `isDirty`, `resetForm`, `setInitialData`, `revealErrors` backed by `usersSchema` from `@/modules/users`.
- **`watch(profile, …)` (immediate)** – Hydrates the form from the store *only while the form is unmodified*; a dirty form is left alone to avoid clobbering in-flight keystrokes.
- **`onMounted(fetchProfile)`** – Loads the record on hard-reload (the session-restore shell does not pre-populate the store).
- **`languageOptions` (computed)** – Maps `supportedLanguages` to `{ value, title }` pairs, labels translated via `t('generic.<code>')`.
- **`applyLanguagePreference(saved?)`** – After a save, chains `changeLanguage(saved)` → `router.replace({ locale: saved })`. Returns immediately (resolved promise) if the locale didn't change; never rejects.
- **`submitForm()`** – Validates → early-returns on failure (`revealErrors`) → no-op if clean → calls `updateProfile(…)` → on success re-baselines the form, fires a success toast, then calls `applyLanguagePreference` on the *server-confirmed* locale. On failure delegates to `notifyErrorMessages`.
- **Template** – `LayoutDefault` wrapper; `v-card` holds the `<form>` plus `ProfileRole`, `ProfilePasswordChange`, `ProfileDeleteAccount`; a second grid block holds `ProfileSessions` and `ProfileAddresses`. Submit button disabled when `!isDirty`.

## Relationships

- **`src/infrastructure/utils/logger.ts`** – Transitive dependency: error paths (`notifyErrorMessages` in `@/infrastructure/utils/errors.ts`, and the `@guebbit/vue-toolkit` notifications store) route structured log entries through the shared logger. `Profile.vue` itself never imports the logger directly.

## Notes

- **Hydrate-never-clobber contract:** the `profile` watcher checks `isDirty` before writing. After a successful save the code explicitly re-baselines (`setInitialData` + `resetForm`) so the next server refresh can hydrate again. Skipping this step leaves the form permanently "dirty" against a stale baseline.
- **Language switch order is load-bearing:** `changeLanguage` must resolve *before* `router.replace`. The `:locale` route param is what `localeChoice` re-applies on the next navigation; swapping the order would immediately revert the runtime language.
- **`locale` is a persisted field**, not a UI-only preference. `Login.vue` reads it back to open the next session in the visitor's chosen language. The save payload includes it; the post-save re-entry reads it from the *server response* (via the store refetch), not the form state.
- **Validation schema** comes from `usersSchema` in `@/modules/users`, shared with the admin user-list views.
- The `name: 'ProfilePage'` in the options block and the `<script setup>` block are both required (options block for the component name used by devtools/router).
