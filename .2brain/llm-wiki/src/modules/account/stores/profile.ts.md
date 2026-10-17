---
source: src/modules/account/stores/profile.ts
sha256: 8f29a3f4ec7868c87dd337f10047da281dc4e676f8c9c938a04ccfded6963536
generated_at: 2026-10-17T00:19:13.832738+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/stores/profile.ts

## Purpose

Pinia store (Composition API) that owns the visitor's own editable `User` record and every self-service operation on it: fetch/update, avatar upload/removal, live password change, email verification and change, account export, and account deletion. It wraps `useStructureRestApi` so all actions share one cache/loading lifecycle rather than duplicating request logic per endpoint.

## Key elements

- **`useProfileStore`** — the exported store (`accountProfile`). Exposes `fetchProfile`, `updateProfile`, `resetAll`, `changePassword`, `requestAccountDelete`, `confirmAccountDelete`, `cancelPendingEmailChange`, `resendPendingEmail`, `confirmEmailChange`, `undoEmailChange`, `requestAccountExport`, `downloadAccountExport`, `confirmEmailVerification`, and the `profile` / `isLoading` / `loading` refs.
- **`publishViewer(user)`** — projects `{ id, email, role, imageUrl, verified }` into `useSessionStore` so shell guards and `isAuth` stay in sync after any identity-revealing call.
- **`avatarLoadingKey(imageUpload?, imageUrl?)`** — returns `['avatar-upload']`, `['avatar-remove']`, or `undefined` to drive the correct `isLoading` bucket for the avatar actions.
- **`guestConsentSyncSettled` (ref)** — one-shot guard that prevents `syncGuestAnalyticsConsent` from firing a second `PATCH /account` in the same session (avoids a re-entrant fetch loop).
- **`optimisticPatch`** — strips `null` values from the write payload before merging into the local cache, so a "clear field" write doesn't store a `null` the read shape doesn't allow.
- **`ProfileWrite` (type)** — widens `imageUrl`, `locale`, `phone`, `website` to accept `null` for the wire contract while the local `User` type stays non-null.

## Relationships

- **`ProfileAvatar.vue`** — the only component that calls `updateProfile` with `imageUpload` (upload) or `imageUrl: null` (removal); passes `onUploadProgress` via the `options` parameter.
- **`ProfilePasswordChange.vue`** — calls the store's `changePassword` action.
- **`ProfileDeleteAccount.vue` / `AccountDeleteConfirm.vue`** — call `requestAccountDelete` then `confirmAccountDelete` on the store.
- **`ProfileExportData.vue`** — calls `requestAccountExport` / `downloadAccountExport`.
- **`use-post-login-redirect.ts`** — triggers `fetchProfile` after a successful login so the shell is populated before route guards evaluate.
- **`auth.ts` (`useAuthStore`)** — handles session establishment/teardown; this store reads the session token for API calls but does not create or destroy sessions.
- **`two-factor.ts`** — co-located account-security store; `changePassword` here may interact with the 2FA flow at the component level.
- **`useSessionStore`** (via `publishViewer`) — the store writes the minimal viewer projection the shell and route guards consume.
- **`useObservabilityStore` / `useAnalyticsConsentStore`** — `fetchProfile` and `updateProfile` set Umami/Faro consent and identify/unidentify the user based on `analyticsConsent`.
- **Tests** — `profile.spec.ts`, `profile-avatar.spec.ts`, `profile-export-data.spec.ts`, `profile-account-consent.spec.ts`, `profile-guest-consent-sync.spec.ts`, `account-export-download-view.spec.ts`, `auth-session.spec.ts` cover the individual actions, the avatar loading-key logic, consent sync, and the auth-session boundary.

## Notes

- **PATCH, not PUT.** `updateProfile` hits `PATCH /account`; omitted fields are preserved. A `PUT` would clear them (RFC 9110 §9.3.4).
- **Self-service endpoint.** The store uses `PATCH /account`, not `PATCH /users/{id}` (the latter is admin-guarded and 403'd non-admins).
- **`imageUrl: null` vs `''`.** The wire contract enforces `minLength: 1`; sending `''` returns a 422. Always send `null` to clear.
- **`imageUrl` / `imageUpload` are mutually exclusive in practice.** `Profile.vue`'s general form must send *neither* to avoid orphaning a concurrently-uploaded file.
- **`guestConsentSyncSettled` is set before the sync request resolves.** A slow or partially-failed sync must not trigger a retry on the next `fetchProfile` in the same session.
- **`syncGuestAnalyticsConsent` runs outside `fetchTarget`'s callback.** Nesting it inside would re-enter `fetchTarget`'s in-flight tracking, since it calls back into `fetchProfile` → `updateProfile`.
- **`resetAll` also clears `useAnalyticsConsentStore`** — once the record is gone the consent banner falls back to the guest cookie.
