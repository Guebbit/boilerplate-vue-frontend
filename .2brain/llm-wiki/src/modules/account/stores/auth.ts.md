---
source: src/modules/account/stores/auth.ts
sha256: e59b4a5ea3708bc810c82cc5c19de3e3a53f1d6270a66b6f04dadd36e3c9cae6
signature: 61cb518a278257fab79ce915b2c9d4869df9e5715123b75f3c2867559c9bc561
generated_at: 2026-11-10T03:26:34.433265+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/stores/auth.ts

## Purpose

Pinia store (Composition API form) that owns the session-lifecycle verbs: login, signup, password reset, and logout. It wraps `useStructureRestApi` for the HTTP calls and coordinates with the session and profile stores, chaining `.then` rather than awaiting each step. It deliberately does **not** own the editable user record — that belongs to `src/modules/account/stores/profile.ts`.

## Key elements

- **`LoginOutcome`** (type export) — Discriminated union the caller branches on: `{ kind: 'session' }`, `{ kind: 'mfa', challenge, expiresAt, methods, defaultMethod? }`, or `{ kind: 'deletion-pending', challenge, expiresAt, purgeAt }`.
- **`useAccountAuthStore`** (store export) — The store itself. Notable actions:
  - `login(email, password, remember?, options?)` — Calls the login API, routes the response through `toLoginOutcome`. On a plain session it adopts the token and fetches the profile; on MFA or deletion-pending it returns the challenge without touching the session store.
  - `signup({ email, password, username?, passwordConfirm?, termsAccepted, analyticsConsent? }, options?)` — Registers a new account with an **idempotency key** (same key on network retry, fresh key on other outcomes). Signs the caller in via cookies.
  - `setAvatarAfterSignup(imageUpload, options?)` — Second half of signup: restores session from cookies, fetches profile, then `PATCH /account` with the file.
  - `requestPasswordReset(email, options?)` — Sends a reset token to the given email.
  - `confirmPasswordReset(token, password, passwordConfirm, termsAccepted?)` — Completes the reset and calls `endLocalSession()` on the profile store.
  - Logout actions (this device / all devices) — Truncated in source but present.
- **`toLoginOutcome`** (internal) — Narrows the raw API union (`AuthTokens | MfaChallenge | DeletionPending`) into `LoginOutcome` using the `in` operator.

## Relationships

- **`src/modules/account/stores/profile.ts`** — `login` calls `fetchProfile` after adopting a session; `confirmPasswordReset` calls `endLocalSession()`; `setAvatarAfterSignup` calls `restoreFromCookies` → `fetchProfile` → `updateProfile`.
- **`src/modules/account/stores/two-factor.ts`** — The MFA branch of `login` returns a challenge that `two-factor`'s `submitLoginCode` consumes; the `remember` flag rides along to that second step.
- **`src/modules/account/stores/deletion-restore.ts`** — The `deletion-pending` outcome carries a `challenge`/`purgeAt` pair that the restore flow submits to `POST /account/login/restore`.
- **`src/modules/account/views/Login.vue`** — Calls `login()` and passes `AxiosRequestConfig` (a solved `HumanCheck` token on anti-bot retry).
- **`src/modules/account/routes.ts`** — Route guards / navigation depend on the auth state this store establishes.
- **`src/modules/account/components/ProfileSessions.vue`** — Consumes session state set by this store (or triggered by its logout actions).
- **`src/modules/account/tests/auth-login-mfa.spec.ts`**, **`src/modules/account/tests/auth-login-restore.spec.ts`**, **`src/modules/account/tests/auth-session.spec.ts`**, **`src/modules/account/tests/auth-signup.spec.ts`**, **`src/modules/account/tests/confirm-once.spec.ts`**, **`src/modules/account/tests/password-reset-confirm-view.spec.ts`**, **`src/modules/account/tests/password-reset-request-view.spec.ts`** — Cover each action's happy path and error contracts.

## Notes

- **No caching**: `login` calls `fetchAny` *without* a cache key; the trailing `if (!outcome) throw` guards against a code path that cannot currently occur but would be dangerous if it did.
- **`remember` semantics**: Maps to `RememberTier.long` (≈ 30 days). Unchecked → browser-session cookie. The 2FA path forwards this to the second step.
- **Idempotency key lifecycle for signup**: The same key is reused on a network/5xx retry (preventing duplicate accounts); any other outcome (success, 422) calls `settle()` to mint a fresh key for the next attempt.
- **`termsAccepted` is typed `true`** (not `boolean`) because the API contract declares `enum: [true]` — you cannot pass `false`.
- **`toLoginOutcome` uses `in` guards**, not optional property access, because `AuthTokens` has no `mfaRequired` field at all; a simple `data.mfaRequired` check would not narrow.
- **Signup signs the user in** (sets cookies); the access token is minted later by the router's restore guard or by `setAvatarAfterSignup` → `restoreFromCookies`.
