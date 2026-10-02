---
source: src/modules/account/stores/auth.ts
sha256: 26c8bbecd9d232618f3b725e1a5521cd2be5f232f1d2dcfbd70742472ec4537a
generated_at: 2026-10-02T14:46:48.325362+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/stores/auth.ts

## Purpose

Pinia store (Composition API) that owns the **session lifecycle**: login, signup, password reset, and the two logout variants. It wraps the `@api` client calls via `useStructureRestApi` and coordinates the session and profile stores after each successful transition. It deliberately does **not** hold the editable user record — that lives in `profile.ts`.

## Key elements

- **`LoginOutcome`** — exported discriminated union (`{ kind: 'session' }` | `{ kind: 'mfa', challenge, expiresAt, methods, defaultMethod? }`). Call sites branch on `kind` rather than sniffing field presence.
- **`useAuthStore`** — the Pinia store (`'accountAuth'`). Returns the seven actions below.
- **`login(email, password, remember?, options?)`** — Calls `apiLogin`. On an `AuthTokens` payload, stores the access token in the session store and chains `useProfileStore().fetchProfile(true)`. On an `MfaChallenge` payload, returns the `mfa` outcome **without** touching the session store. Uses `'mfaRequired' in payload` (not optional-access) for the type guard.
- **`signup(credentials, options?)`** — Calls `apiSignup` with an `Idempotency-Key` (settle-on-success, settle-with-error-on-failure). `username` defaults to `email`, `passwordConfirm` to `password`. `termsAccepted` is typed as `true` (API enum constraint). Does **not** store a token — the response sets cookies only.
- **`setAvatarAfterSignup(imageUpload, options?)`** — Follow-up `PATCH /account` for the avatar picked during signup. Chains `session.refreshToken()` → `profile.fetchProfile(true)` → `profile.updateProfile({ imageUpload })`.
- **`requestPasswordReset(email, options?)`** — Sends reset token to email.
- **`confirmPasswordReset(token, password, passwordConfirm)`** — Completes the reset.
- **`logout()`** — Ends the current session (`session.logout()`), then resets the profile store and re-syncs the analytics consent tracker to the guest answer.
- **`logoutEverywhere()`** — Same local cleanup but calls `session.logoutAll()` to revoke every refresh token.

## Relationships

- **`stores/profile.ts`** — `useProfileStore` is pulled in after a successful login (to fetch the record), in `setAvatarAfterSignup` (to mint the token, fetch the record, then patch the avatar), and on both logout paths (to `resetAll()` the cached record).
- **`stores/two-factor.ts`** — The `mfa` branch of `login` returns a challenge that the caller hands to `useTwoFactorStore().submitLoginCode` for the second step. This store does not import or call `two-factor.ts` directly; the hand-off is at the view layer.

## Notes

- **`remember` mapping:** `true` → `RememberTier.medium` (≈ 30 days); `false` → `undefined`, which the API interprets as a browser-session cookie. On the 2FA path the tier rides along to the second step.
- **Idempotency on signup:** `useIdempotencyKey()` reuses the same key across retries (network errors, 5xx) so a lost response never creates a duplicate account; a 4xx (e.g. "email taken") mints a fresh key for the next attempt.
- **`fetchAny` null guard:** `login` explicitly throws if `fetchAny` resolves `undefined`. That path is only reachable via a cached (`key`) call, which `login` never makes — the throw is a safety net, not an expected branch.
- **Token vs. cookies after signup:** Signup sets httpOnly session cookies but does **not** return an access token. Any follow-up call (e.g. `setAvatarAfterSignup`) must `session.refreshToken()` first.
- **`options` param:** Forwarded to the `orvalMutator`. Used by views to attach a solved `HumanCheck` token (anti-bot retry) or `onUploadProgress`.
- **httpOnly cookie:** The `jwt` cookie can only be cleared server-side; `isAuth` is the JS-accessible flag that `session.logout` clears.
