# src/modules/account/views/Profile.vue

## Purpose

The account profile page. It lets a signed-in user edit the fields they own (username, email, phone, website, language preference) and, as a sibling layout, surfaces the role, password-change, account-deletion, active-sessions, and address panels—each of which manages its own store slice independently.

## Key elements

- **`ProfileForm` interface** — Shape of the editable record. Every field is `optional | null` to match how the store refills `profile.value`, not the stricter API contract.
- **`submitForm`** — Validates via `useStructureFormValidation`, bails early if dirty-check fails, then calls `updateProfile` from the profile store. On success it re-baselines the form and fires `applyLanguagePreference`.
- **`applyLanguagePreference(saved)`** — After a save, chains `changeLanguage(saved)` → `router.replace` with the new `:locale` param. Never rejects; a failed re-entry must not surface a save failure.
- **`watch(profile, …)`** — Hydrates the form from the store, but **only** when `isDirty` is false (i.e. the visitor hasn't started typing). Prevents the server-state race that garbled a mid-edit email in e2e tests.
- **`onMounted(fetchProfile)`** — Guarantees the full record exists after a hard reload of `/profile` (session restore only fills a viewer projection, leaving the store empty).
- **`languageOptions` (computed)** — Maps `supportedLanguages` (populated at boot from `GET /locales`) to `{ value, title }` pairs, with titles translated in the current locale.
- **`useStructureFormValidation`** (from `@guebbit/vue-toolkit`) — Wires `form`, `formErrors`, `isDirty`, `resetForm`, `validate`, `revealErrors`, `setInitialData` against `usersSchema`.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — Transitive dependency reached through `notifyErrorMessages` (imported from `@/infrastructure/utils/errors.ts`). Error toasts surfaced on failed saves ultimately log via this utility.
- **`@/modules/account/stores/profile.ts`** — `useProfileStore` supplies `profile`, `updateProfile`, `fetchProfile`.
- **`@/infrastructure/i18n`** — `changeLanguage` and `supportedLanguages` drive the language-select and the post-save locale switch.
- **Sibling panels** (`ProfileRole`, `ProfilePasswordChange`, `ProfileDeleteAccount`, `ProfileSessions`, `ProfileAddresses`) — Rendered as independent components; no shared form state with this file.

## Notes

- **Hydrate-never-clobber:** The `watch` on `profile` checks `isDirty` before calling `setInitialData` + `resetForm`. After a successful save the handler explicitly re-baselines (`setInitialData(profile.value ?? {})`) so the next hydration cycle works against fresh server state.
- **Locale is a persisted record field, not UI state:** `PUT /account` accepts `locale`, and `Login.vue` reads it back on the next sign-in. The `applyLanguagePreference` double-step (i18n switch → route param update) mirrors the header's language switcher for the same reason: without the route re-entry, `localeChoice` re-applies the old param on the next navigation.
- **`submitForm` guard order:** `validate()` → `isDirty` check → `updateProfile`. The dirty-check after validation means a keyboard-submit on an untouched, valid form is a silent no-op (the button is disabled, so only `Enter` reaches it).
- **`imageUrl` coalescing:** `form.value.imageUrl ?? undefined` in the save payload—null and undefined are treated the same by the API, but the store type uses `null`.
