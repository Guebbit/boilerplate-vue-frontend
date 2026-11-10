---
source: src/modules/account/stores/profile.ts
sha256: 9a378339abc9c38e2ea40efceb3a691ba40a5f5e2148420b0607b5a557814c0f
signature: f8fcd2f753d6071189d84ca6bf9bd49201060655273f8d4782dadf6354c1c621
generated_at: 2026-11-10T03:27:51.988234+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/stores/profile.ts

## Purpose

Pinia store (Composition API) that owns the authenticated visitor's own `Account` record and every self-service operation on it: fetch/update, avatar upload/removal, live password change, email verification and email-change lifecycle, account deletion/restore, and data export. It wraps `useStructureRestApi` from `@guebbit/vue-toolkit` so all actions reuse shared `selectedIdentifier`/`fetchTarget`/`updateTarget` primitives instead of duplicating request and cache logic per action.

## Key elements

- **`useAccountProfileStore`** — the exported Pinia store (`account-profile`). Exposes `profile`, `isLoading`, `fetchProfile`, `updateProfile`, `changePassword`, email-change functions, deletion/restore, export, and `resetAll`.
- **`fetchProfile(forced?, known?)`** — Loads the account (or adopts a sign-in's `AccountView` directly to skip a second `GET`). Deconstructs `abilities`/`activity` out of the view (they belong to the session store, never to a write payload), sets the Umami/Faro consent flags, calls `publishViewer`, then runs `syncGuestAnalyticsConsent` *outside* the `fetchTarget` callback to avoid re-entering the in-flight loading state.
- **`updateProfile(userData, options?)`** — Issues `PATCH /account` (merge semantics, not `PUT`). Accepts `imageUpload` (switches to multipart) or `imageUrl: null` (removal). Uses `optimisticPatch` + `omitNulls` to patch the local cache. Selects the loading bucket via `updateLoadingKey`.
- **`publishViewer(user?, answer?)`** — Pushes the minimal `{ id, email, role, imageUrl, verified }` projection into the session store so guards and the shell stay in sync.
- **`resetAll()`** — Clears the cached record *and* resets the analytics-consent account choice so the banner falls back to the guest cookie.
- **`updateLoadingKey(imageUpload?, imageUrl?)`** — Returns the `isLoading` array key: `['avatar-upload']`, `['avatar-remove']`, or `['save']`.
- **`syncGuestAnalyticsConsent`** — One-shot (guarded by `guestConsentSyncSettled`) sync of a pre-auth guest consent cookie onto the fresh account via a `PATCH`. The flag is set *before* the request to prevent a retry loop if a later `fetchProfile` fires.
- **`ProfileWrite` type** — `Partial<Account>` widened so `locale`, `phone`, `website`, and `imageUrl` accept `null` (the write contract allows clearing; the read shape does not).
- **Email / export / deletion actions** — Thin wrappers over the imported API functions (`requestEmailChange`, `confirmEmailChange`, `undoEmailChange`, `requestAccountExport`, `downloadAccountExport`, `requestAccountDelete`, `restoreAccount`, etc.).

## Relationships

- **`src/modules/account/stores/auth.ts`** — `publishViewer` writes the shell's `{ id, email, role, imageUrl, verified }` projection into the session store on every fetch/update so guards never lag behind the record.
- **`src/modules/account/stores/two-factor.ts`** — Password-change and email-change flows coordinate with two-factor step-up (the store's doc comment notes email change sits "behind a step-up of its own").
- **`src/modules/account/stores/deletion-restore.ts`** — Account deletion and restore API calls live here; the profile store delegates to the same `@api` functions (`requestAccountDelete`, `restoreAccount`).
- **`src/modules/account/components/ProfileAvatar.vue`** — Sole caller that sets `imageUpload` or `imageUrl: null` on `updateProfile`; passes `onUploadProgress` via the axios options parameter.
- **`src/modules/account/components/ProfilePasswordChange.vue`** — Calls `changePassword`.
- **`src/modules/account/components/ProfileExportData.vue`** — Calls `requestAccountExport` / `downloadAccountExport`.
- **`src/modules/account/components/ProfileDeleteAccount.vue`** — Calls the deletion/restore actions.
- **`src/modules/account/composables/use-post-login-redirect.ts`** — Consumes `fetchProfile` (passing the sign-in's `AccountView` as `known`) to hydrate the record without a second `GET`.
- **`src/modules/account/tests/profile-account-consent.spec.ts`** — Exercises the analytics-consent sync and `resetAll` clearing behavior.
- **`src/modules/account/tests/delete-account-panel.spec.ts`** — Tests the deletion/restore flow through this store.
- **`src/modules/account/tests/account-export-download-view.spec.ts`** — Tests the export request/download actions.
- **`src/modules/account/tests/auth-session.spec.ts`** — Tests the `publishViewer` → session-store projection contract.

## Notes

- **PATCH, not PUT.** `updateProfile` uses `PATCH /account` (RFC 9110 §9.3.4 merge). A `PUT` would clear every omitted field. This was a historical bug: self-service writes were originally routed through `PATCH /users/{id}` behind the admin guard, which 403'd every non-admin.
- **`abilities` / `activity` are never sent back.** They are destructured out of the `AccountView` before the record is cached; a write must not include them.
- **`imageUrl: null` vs `''`.** Removal sends `null`, not an empty string — the API contract's `minLength: 1` rejects `''` with a 422.
- **`guestConsentSyncSettled` is set before the request resolves.** This prevents a slow or absent-consent response from being retried by a subsequent `fetchProfile` in the same session.
- **`syncGuestAnalyticsConsent` runs outside the `fetchTarget` callback.** Nesting it inside would re-enter `fetchTarget`'s in-flight loading state before it settles.
- **`Profile.vue`'s details form must not send `imageUrl` or `imageUpload`.** Re-sending an already-loaded `imageUrl` would overwrite a concurrent avatar change and orphan the uploaded file.
- **Separation from `auth.ts`.** This store holds the full `Account`; `auth.ts` owns establishing/ending the session. The split is documented in `docs/theory/layers.md`.
