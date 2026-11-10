---
source: src/modules/account/stores/deletion-restore.ts
sha256: 8ddc2dfbfd7cf6b55c96e59909ca0bf3a410e1764f7a553e7a928654ec5649da
signature: 62b56b78d8fe31cc84877c2cf137d2c0e19679579b092366cae5e8d7c4345284
generated_at: 2026-11-10T03:26:56.106688+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/stores/deletion-restore.ts

## Purpose

Pinia store (Composition API) that backs the single screen shown when a user signs in to an account currently in its deletion grace period. The server returns a claim check instead of a session; this store holds that check, lets the user either redeem it (restore + sign in) or discard it (let the account be purged). It supports two entry paths: form-based sign-in (challenge in the response body) and OAuth redirect (challenge in an httpOnly cookie, dates in the query string).

## Key elements

- **`PendingRestore`** — internal interface describing the active offer: optional `challenge` string, `expiresAt`, `purgeAt`, optional `remember` boolean. Absent `challenge`/`remember` signals the OAuth path.
- **`useAccountDeletionRestoreStore`** — the exported Pinia store.
  - `pending: Ref<PendingRestore | undefined>` — the live offer; `undefined` means no active offer (page reload, spent check, etc.).
  - `loading` — reactive flag from the toolkit's `useStructureRestApi` wrapper.
  - `begin(outcome, remember)` — populates `pending` from the `deletion-pending` branch of a `LoginOutcome` (password or 2FA step).
  - `beginOAuth({ purgeAt, expiresAt })` — populates `pending` for the OAuth path; no challenge or remember value is stored because the backend reads the cookie directly.
  - `clear()` — sets `pending` back to `undefined`.
  - `restoreAndSignIn()` — calls `POST /account/login/restore` with the challenge and optional remember tier, adopts the returned session via the session store, fetches the profile, then clears the offer. Rejects with `NO_ACTIVE_RESTORE` if no offer is active.

## Relationships

- **`src/modules/account/stores/auth.ts`** — imports the `LoginOutcome` type; `begin()` consumes its `deletion-pending` branch.
- **`src/modules/account/stores/profile.ts`** — imports `useAccountProfileStore`; `restoreAndSignIn()` calls `fetchProfile` after the session is adopted.
- **`src/modules/account/views/Login.vue`** — calls `begin()` when the login response indicates the account is in deletion grace.
- **`src/modules/account/views/OAuthCallback.vue`** — calls `beginOAuth()` after parsing `purgeAt`/`expiresAt` from the redirect query string.
- **`src/modules/account/views/AccountRestoreChallenge.vue`** — the view rendered while `pending` is defined; calls `restoreAndSignIn()` or `clear()` based on the user's choice.
- **Tests** (`src/modules/account/tests/account-restore-challenge-view.spec.ts`, `src/modules/account/tests/auth-login-restore.spec.ts`, `src/modules/account/tests/oauth-callback-view.spec.ts`, `src/modules/account/tests/two-factor-store.spec.ts`) — exercise the store's state transitions and the view interactions above.

## Notes

- The OAuth path intentionally stores **no** `challenge` or `remember` in `pending`; the backend reads the claim check from the httpOnly cookie on the `restoreAndSignIn` call, so the store only carries the two date fields.
- `restoreAndSignIn` resolves only after **both** session adoption and profile fetch succeed; the offer is cleared inside that chain. A failure at either step leaves `pending` intact (the user can retry).
- The `remember` boolean is mapped to `RememberTier.long` or `undefined` for the API call, but the raw boolean is also passed to `useSessionStore().adoptSession` — two different consumers of the same flag.
- The store uses the toolkit's `useStructureRestApi` / `fetchAny` wrapper rather than calling the API module directly, which means `loading` reflects only in-flight restore requests, not other account mutations.
