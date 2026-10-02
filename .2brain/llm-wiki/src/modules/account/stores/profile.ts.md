---
source: src/modules/account/stores/profile.ts
sha256: 96e1e87b263a16c2c958f4179876637d42df864034c099d201e84b8cb1cb8b7e
generated_at: 2026-10-02T14:47:31.616911+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/stores/profile.ts

## Purpose

Pinia store (Composition API) that owns the visitor's own editable `User` record: fetching, updating (including avatar upload/removal), password change, email verification, and account deletion. It wraps the shared `useStructureRestApi` toolkit so every action reuses the same `selectedIdentifier` / `fetchTarget` / `updateTarget` primitives instead of duplicating request and cache logic per action. It is deliberately separate from the session store, which only holds the minimal `{ id, email, role, imageUrl, verified }` projection the shell and route guards need.

## Key elements

- **`useProfileStore`** — the sole export; a `defineStore('accountProfile', …)` in setup/composition form.
- **`avatarLoadingKey`** — maps a profile write to the correct `isLoading` bucket (`'avatar-upload'`, `'avatar-remove'`, or `undefined` for a plain field save).
- **`publishViewer`** — pushes the freshly loaded/updated identity (id, email, role with `unverified` fallback, imageUrl, verified flag) into `useSessionStore` so guards never lag.
- **`guestConsentSyncSettled`** — one-shot ref preventing a retry loop when syncing a guest's cookie-held analytics consent onto a newly authenticated account.
- **`fetchProfile(forced?)`** — loads the account via `GET /account`, unwraps the envelope, sets `selectedIdentifier`, updates the observability store (Umami/Faro identify/unidentify based on `analyticsConsent`), calls `publishViewer`, then runs `syncGuestAnalyticsConsent` *outside* the `fetchTarget` callback to avoid re-entering its in-flight state.
- **`ProfileWrite`** (type) — the accepted write shape; widens `imageUrl`, `locale`, `phone`, `website` to allow `null` (clear) even though the read-model `User` never holds them.
- **`optimisticPatch`** — strips `null`-valued fields before merging into the local cache.
- **`updateProfile`** — `PATCH /account` (merge semantics, not `PUT`). Sends a fixed allow-list of fields (`email`, `username`, `locale`, `phone`, `website`, `analyticsConsent`); routes to `multipart/form-data` when `imageUpload` is present. Rejects with `'invalid user'` if no identifier is selected.
- **Account lifecycle actions** (imported from `@api`): `requestAccountDelete`, `confirmAccountDelete`, `changePassword`, `confirmEmailVerification`, `confirmEmailChange`, `cancelPendingEmailChange`, `exportAccountData`.

## Relationships

- **`src/modules/account/stores/auth.ts`** (`useAuthStore`) — sibling store in the same domain. Auth owns establishing/tearing down the session; this store owns the profile data *within* that session. `publishViewer` writes the viewer projection into `useSessionStore` (infrastructure layer) so the two stay in sync. No direct import of `auth.ts` exists in this file.
- **`src/modules/account/stores/two-factor.ts`** — listed as a graph neighbor but no direct import or call is visible in this file's content; the relationship is a shared account-domain sibling.

## Notes

- **PATCH, not PUT, not `/users/{id}`** — the self-service endpoint is `PATCH /account`. Routing through the admin `PATCH /users/{id}` previously returned 403 to non-admins; that bug is documented in the `updateProfile` JSDoc.
- **`imageUrl: null` vs `''`** — the API contract enforces `minLength: 1`, so an empty string is rejected with 422. Removal must send literal `null`.
- **`Profile.vue` must not re-send `imageUrl`** — doing so would overwrite a concurrent avatar upload and orphan the file. Only `ProfileAvatar.vue` sets `imageUrl` or `imageUpload`.
- **`syncGuestAnalyticsConsent` runs after `fetchTarget` settles** — intentionally outside the callback to avoid re-entering `fetchTarget`'s in-flight tracking (it may call back into `fetchProfile`).
- **Role fallback is `'unverified'`**, not `'customer'` — matching the backend's resolution of an absent role.
- **`analyticsConsent` is checked on every `fetchProfile`**, not cached, so toggling consent and immediately re-fetching correctly flips Umami identify/unidentify.
