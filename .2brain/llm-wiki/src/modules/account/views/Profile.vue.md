---
source: src/modules/account/views/Profile.vue
sha256: fb5f3df451d2d89507805ca06ae40cfb33b120e84e34e0a7e55c08280f4f132b
signature: fb5f3df451d2d89507805ca06ae40cfb33b120e84e34e0a7e55c08280f4f132b
generated_at: 2026-11-10T03:47:58.737083+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/Profile.vue

## Purpose

The account profile page. Composes a record-edit form (username, phone, website, locale, analytics consent) as the primary panel, with sibling components for avatar, password, 2FA, sessions, addresses, connected accounts, export, and delete. Owns the save flow (validation → `PATCH /account` → re-baseline → optional language re-route) and the email-change sub-flow (request, resend-with-cooldown, cancel).

## Key elements

- **`ProfilePage`** (default export, named block) — gives the SFC a stable `name` for `<KeepAlive>` / devtools.
- **`ProfileForm`** (interface) — the form-state shape; every field is `? | null` to mirror the nullable store payload.
- **`submitForm`** — validates via `useStructureFormValidation`, builds the request with `toRequestBody('UpdateAccountBody', …)`, calls `updateProfile`, re-baselines the form, then calls `applyLanguagePreference`. Deliberately omits `imageUrl` and `email` from the body.
- **`applyLanguagePreference(saved)`** — `router.replace` to re-enter the current route under the saved locale. Routing only; the locale guard is what loads the dictionary. Never rejects.
- **`languageOptions`** (computed) — maps `supportedLanguages` to `{ value, title }` for the select, titles translated in the active locale.
- **`useStaleRecord`** integration — on a 412 response, calls `fetchProfile(true)` to bypass the cache and re-baselines the form on the fresh record.
- **`useBlockingError`** (two instances) — in-place error surfaces for the save button and the pending-email actions.
- **`useCountdown(resendAvailableAt)`** — drives the Resend-button cooldown from a server-supplied timestamp.
- **`useLeaveGuard(isDirty, …)`** — warns on navigation while the form is dirty.
- **`watch(profile, …)`** — hydrates the form via `setInitialData` + `resetForm` only while the form is untouched; never overwrites a dirty form.
- **`onMounted(fetchProfile)`** — loads the record on first mount so a hard reload of `/profile` doesn't start with an empty form.

## Relationships

- **`src/modules/account/stores/profile.ts`** — primary data source: `useAccountProfileStore` supplies `profile`, `savingProfile`, `changingPendingEmail`, and the action methods `fetchProfile`, `updateProfile`, `requestEmailChange`, `cancelPendingEmailChange`, `resendPendingEmail`.
- **`src/modules/account/components/ProfileAvatar.vue`** — sibling panel; the sole writer of `imageUrl` (the profile form never touches it).
- **`src/modules/account/components/ProfilePasswordChange.vue`** — sibling panel; owns its own password-change flow.
- **`src/modules/account/components/ProfileTwoFactor.vue`** — sibling panel.
- **`src/modules/account/components/ProfileSessions.vue`** — sibling panel.
- **`src/modules/account/components/ProfileAddresses.vue`** — sibling panel.
- **`src/modules/account/components/ProfileConnectedAccounts.vue`** — sibling panel.
- **`src/modules/account/components/ProfileDeleteAccount.vue`** — sibling panel; placed **last** in the DOM so it is the most distant destructive control.
- **`src/modules/account/components/ProfileExportData.vue`** — sibling panel.
- **`src/modules/account/components/PurchaseHoldNotice.vue`** — imported as a sibling notice.
- **`src/modules/account/composables/use-countdown.ts`** — provides the countdown ref for the email-resend cooldown.
- **`src/modules/account/tests/profile-page.spec.ts`** — unit tests for this page.
- **`src/modules/account/tests/profile-stale-record.spec.ts`** — tests the 412 / stale-record reload path.

## Notes

- **Panel order is intentional.** `ProfileDeleteAccount` is rendered last so a user scrolling down to change their password doesn't pass the delete control.
- **`applyLanguagePreference` is routing-only.** It changes the `:locale` route param; the locale guard (elsewhere) is what actually loads the i18n bundle. Calling the i18n runtime here first would make the guard's compare-against-active check see no change.
- **Hydration guard.** The `watch(profile, …)` callback checks `isDirty` before calling `setInitialData`/`resetForm`. A dirty form is the visitor's; only the save-success path re-baselines it.
- **`submitForm` omits `email` and `imageUrl`.** Email has its own request/cancel flow; `imageUrl` is owned exclusively by `ProfileAvatar`. Sending either back would clobber a concurrent write.
- **`toRequestBody` baseline.** Passing `profile.value` as the baseline lets `toRequestBody` emit `null` for intentionally cleared optional fields (phone, website) rather than an empty string that would 422.
- **Two separate `useBlockingError` instances.** Save errors and pending-email errors are surfaced independently so a failed email resend doesn't block the main form and vice-versa.
