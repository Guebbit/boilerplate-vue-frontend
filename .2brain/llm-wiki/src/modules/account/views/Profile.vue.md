---
source: src/modules/account/views/Profile.vue
sha256: 9d558ea3b01a8526b265b68ae57b089f1b09f91cf77043e728be0240b0f6a25e
generated_at: 2026-10-17T00:30:46.037770+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/Profile.vue

## Purpose

The profile page composes the record-edit form (email, username, locale, phone, website, analytics consent) alongside sibling panels for avatar, password, 2FA, sessions, addresses, connected accounts, data export, and account deletion. Each panel owns its own store slice; this file orchestrates the shared form lifecycle, language-preference routing, stale-record recovery, and pending-email actions.

## Key elements

- **`ProfileForm` interface** — The nullable form shape every field is `?` + `null`-optional, matching how the store hydrates rather than the API contract.
- **`useStructureFormValidation` (toolkit)** — Wires `usersSchema` to the form element; provides `validate`, `revealErrors`, `isDirty`, `resetForm`, `setInitialData`, `applyServerErrors`.
- **`watch(profile, …)`** — Hydrates the form from the store only while `isDirty` is false (never clobbers in-progress keystrokes).
- **`applyLanguagePreference(saved)`** — Re-enters the current route with the new `:locale` param (routing only; the locale guard loads/activates the dictionary). Resolves `Promise<void>`; never rejects.
- **`submitForm()`** — Validates, builds the PATCH body via `toRequestBody('UpdateAccountBody', …)`, calls `updateProfile`, re-baselines the form, toasts success, then applies the language preference. On 412 delegates to `handleStaleSave`; on other errors calls `applyServerErrors` → `reportSaveError`.
- **`useBlockingError` (×2)** — One for the save action (`saveError`), one for pending-email actions (`pendingEmailError`). Rendered via `InlineErrorAlert`.
- **`useStaleRecord`** — 412 handler; `reloadLatest` forces a re-fetch past cache, re-baselines the form, and refreshes the ETag for the next save.
- **`useCountdown(resendAvailableAt)`** — Drives the Resend cooldown; the target timestamp is always server-supplied (`resendAfter` or 429 `retryAfter`).
- **`savingProfile` / `pendingEmailActionInFlight` refs** — Guard against double-submits (button is disabled, but keyboard Enter still fires).
- **`languageOptions` computed** — Maps `supportedLanguages` to `{ value, title }` using the active locale for display names.

## Relationships

- **`stores/profile.ts`** — Source of `useProfileStore`; provides `profile` ref, `updateProfile`, `fetchProfile`, `cancelPendingEmailChange`, `resendPendingEmail`.
- **`components/ProfileAvatar.vue`** — Sibling panel; the *only* writer of `imageUrl` (this form deliberately omits it from the PATCH body to avoid overwriting the avatar's upload).
- **`components/ProfilePasswordChange.vue`**, **`ProfileTwoFactor.vue`**, **`ProfileSessions.vue`**, **`ProfileAddresses.vue`**, **`ProfileConnectedAccounts.vue`**, **`ProfileExportData.vue`** — Sibling panels, each with its own store slice; rendered in deliberate order.
- **`components/ProfileDeleteAccount.vue`** — Rendered **last** in the template so it is never reached on the way to less destructive panels.
- **`composables/use-countdown.ts`** — Supplies `secondsLeft` for the resend cooldown UI.
- **`tests/profile-page.spec.ts`** — Unit/integration tests for this page's form and save flow.
- **`tests/profile-stale-record.spec.ts`** — Exercises the 412 / `useStaleRecord` path and the re-baseline behaviour.

## Notes

- **Two `<script>` blocks** — The default-export block exists solely to set `name: 'ProfilePage'` for `<KeepAlive>` / devtools; `<script setup>` cannot declare a component name itself.
- **`onMounted(fetchProfile)`** — Session restore fills only the shell's viewer projection, so a hard reload of `/profile` would otherwise mount an empty form whose first save fails validation.
- **`imageUrl` is never sent by this form** — Including the loaded value in every details save would overwrite whatever `ProfileAvatar` just wrote and orphan the uploaded file.
- **`toRequestBody` baseline diff** — Unchanged fields are omitted from the PATCH body; emptied optional fields (phone, website) become `null` rather than `''` (which would 422).
- **Language switch is routing-only** — Calling the i18n runtime here first would make the locale guard see "already active" and skip the dictionary load. The param change triggers the guard, which does the real work.
- **`revalidateOn: locale`** — Changing the active locale re-runs schema validation so locale-specific constraints (e.g. email format messages) update without a manual save.
