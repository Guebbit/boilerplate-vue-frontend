---
source: src/modules/account/views/Profile.vue
sha256: 7a6a9ea4ac194a7e12d4424bfd95f8a67ffa31ab0844799c1ca410192469e49e
generated_at: 2026-10-02T14:53:27.767319+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/Profile.vue

## Purpose

The account profile page. It renders the main record-edit form (email, username, locale, phone, website, analytics consent) and composes six sibling panels (avatar, password, 2FA, sessions, addresses, delete) as independent components. It owns form validation, the `PATCH /account` save flow, stale-record (412) recovery, pending-email resend/cancel, and post-save language re-routing.

## Key elements

- **`ProfileForm`** — Local interface for the editable record; every field is `| null` in addition to `?` to match the store's hydrated shape rather than the stricter API contract.
- **`formElement` / `useStructureFormValidation`** — Toolkit-driven validation wired to the `<form>` ref; uses `VUETIFY_INVALID_FIELD_SELECTOR` and re-validates when `locale` changes so error messages re-localize.
- **`watch(profile, …)`** — Hydrates the form from the store **only while it is untouched** (`!isDirty`); a dirty form is never overwritten by a late fetch.
- **`languageOptions`** — Computed list built from `supportedLanguages` (populated at boot from `GET /locales`), labels translated via `t('generic.<code>')`.
- **`applyLanguagePreference(saved)`** — After a successful save, re-enters the current route with the new `:locale` param. Routing-only by design; the locale route guard performs the actual dictionary load. Never rejects.
- **`useBlockingError` (save)** — `saveError` / `reportSaveError` / `warnSave` / `clearSaveError` surface a failed `PATCH` inline next to the submit button.
- **`useStaleRecord`** — Catches 412, offers "reload latest" (bypasses store cache, refetches, re-baselines form, refreshes ETag).
- **`submitForm()`** — Validates → builds a diffed body via `toRequestBody('UpdateAccountBody', …, profile.value)` → calls `updateProfile` → re-baselines → toasts → `applyLanguagePreference`. Deliberately omits `imageUrl` (avatar panel owns that field) and omits unchanged email/consent fields.
- **`resendPendingEmail()` / cancel flow** — Separate `useBlockingError` and shared `pendingEmailActionInFlight` flag. Resend is two sequential calls (cancel existing → re-request same address) because the backend has no dedicated resend endpoint and treats a repeated address as a no-op.
- **`onMounted(fetchProfile)`** — Ensures the store holds a record on hard-reload of `/profile`; the session restore only fills the shell's viewer projection, not this form's data.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — Transitive dependency: not imported directly here, but reached through `useBlockingError` and `useStaleRecord` (both in `@/infrastructure/utils/`), which emit diagnostic log lines for unhandled save failures and stale-record rejections.

## Notes

- **Panel order is deliberate.** `ProfileDeleteAccount` is rendered last so the most destructive action is never on the path to the password or sessions panels.
- **`imageUrl` must never appear in this form's save body.** Only `ProfileAvatar` writes it via its own request; including it here would orphan a freshly uploaded file.
- **`toRequestBody` diffing semantics:** an unchanged `email` or `analyticsConsent` is *omitted* from the PATCH body (sending it back is treated as a real request); an emptied `phone`/`website` is sent as `null` (the explicit clear) rather than `''` (which 422s).
- **Re-baseline after every save.** `setInitialData` + `resetForm` run after the server confirms, otherwise the form stays permanently "dirty" against a stale baseline and blocks the next hydration.
- **Keyboard-only edge case.** The submit button is disabled while saving or when clean, but a keyboard `Enter` on a focused input still fires `submitForm`; the `isDirty`/`savingProfile` guards catch that path.
