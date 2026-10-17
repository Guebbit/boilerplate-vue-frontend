---
source: src/modules/account/stores/auth.ts
sha256: e13a6b43c76cff0a451ccd9a6a06b596fe71afcad099bed4b194250b74bd0b35
generated_at: 2026-10-17T00:18:48.601529+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/stores/auth.ts

## Purpose

Pinia store (Composition API) that owns the **session lifecycle**: login, signup, password reset, and the two logout paths. It wraps the generated REST calls from `@api` via `useStructureRestApi`, then coordinates the resulting state into the session store and profile store rather than holding user-editable data itself.

## Key elements

- **`LoginOutcome`** (exported type) — discriminated union: `{ kind: 'session' }` or `{ kind: 'mfa', challenge, expiresAt, methods, defaultMethod }`. Call sites branch on `kind` instead of sniffing optional fields.
- **`useAuthStore`** (exported, id `'accountAuth'`) — the store. Exposes:
  - `login(email, password, remember?, options?)` — calls `apiLogin`; on a plain response adopts the session and loads the profile; on an MFA challenge resolves with the `mfa` variant without touching the session store.
  - `signup(credentials, options?)` — calls `apiSignup` with an **idempotency key** (`useIdempotencyKey`) so a network retry never double-creates an account. Sets session cookies only.
  - `setAvatarAfterSignup(imageUpload, options?)` — the follow-up `PATCH /account` for an avatar picked on the signup form; restores the session from cookies, fetches the profile, then updates it.
  - `requestPasswordReset(email, options?)` — sends the reset token by email.
  - `confirmPasswordReset(token, password, passwordConfirm)` — completes the reset.
  - `logout()` — revokes **this** session; clears profile cache, unidentifies the observability user, re-syncs analytics consent.
  - `logoutEverywhere()` — revokes **all** sessions for the account (compromised-credentials path); same local cleanup.

## Relationships

- **`stores/profile.ts`** (`useProfileStore`) — imported and called directly: `fetchProfile(true)` after successful login/signup, `updateProfile` for the post-signup avatar, `resetAll()` on both logout paths.
- **`@/infrastructure/session.ts`** (`useSessionStore`) — the session tokens/cookies are written via `adoptSession`, read via `restoreFromCookies`, and cleared via `logout` / `logoutAll`.
- **`stores/two-factor.ts`** (`useTwoFactorStore`) — consumer of the `mfa` branch of `LoginOutcome`; `submitLoginCode` carries the `remember` tier forward to the second step.
- **`views/Login.vue`** — calls `login()`, passing a solved `HumanCheck` token through `options` on anti-bot retry.
- **`views/Signup.vue`** — calls `signup()` then `setAvatarAfterSignup()`, passing `onUploadProgress` via `options`.
- **`views/PasswordResetRequest.vue`** — calls `requestPasswordReset()`, attaching a `HumanCheck` token through `options`.
- **`views/PasswordResetConfirm.vue`** — calls `confirmPasswordReset()`.
- **`components/ProfileSessions.vue`** — surfaces `logoutEverywhere()` from the sessions panel.
- **`routes.ts`** — the router's restore guard mints the access token from cookies after signup.
- **`tests/auth-*.spec.ts`**, **`tests/password-reset-request-view.spec.ts`**, **`tests/profile-account-consent.spec.ts`** — spec files exercising the store's actions and their side-effects on session/profile/consent stores.

## Notes

- **Signup ≠ token.** `apiSignup` sets httpOnly session cookies only; no access token is returned. The caller must either call `setAvatarAfterSignup` (which invokes `restoreFromCookies`) or rely on the router's restore guard to mint the token.
- **`remember` is binary.** `true` maps to `RememberTier.medium` (≈ 30 days); `false`/omitted lets the API default to a browser-session cookie. There is no longer/shorter tier exposed here.
- **MFA narrowing uses `in`.** The code checks `'mfaRequired' in payload` rather than a truthy optional read, because `AuthTokens` simply lacks that field. Don't "simplify" this to `payload.mfaRequired`.
- **Idempotency key lifecycle.** `signupIdempotencyKey.withKey(options)` attaches the key; `settle()` or `settle(error)` releases it. A 4xx (e.g. "email taken") mints a fresh key for the next attempt; a network/5xx retry reuses the same key.
- **httpOnly cookie.** The `jwt` cookie is httpOnly and can only be cleared server-side. `logout`/`logoutEverywhere` clear the JS-accessible `isAuth` flag and local state; the server-side revocation is implicit in the API call.
- **Not here on purpose.** The editable profile record (name, avatar, consent, etc.) lives in `stores/profile.ts`. This store coordinates but does not own that data.
