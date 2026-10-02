---
source: src/modules/account/stores/two-factor.ts
sha256: f19dd4f717f38ba238bb8f7ca1fa2bd65b04f451057901267359c7c02570a17f
generated_at: 2026-10-02T14:48:05.573079+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/stores/two-factor.ts

## Purpose

Pinia store (Composition API) that centralises every 2FA surface for a single account: the armed/available-method status, the enrollment machine (setup → confirm → backup codes), and the login-time challenge (send code → submit code). It exists as one store rather than three because the enrollment and status endpoints share the same `GET /account/2fa` resource, and the login challenge reuses the same server-driven resend cooldown as enrollment's "send me a code" step.

## Key elements

- **`useTwoFactorStore`** — the exported Pinia store (`'accountTwoFactor'`). Composition-API form; all state is plain `ref`s, actions re-read from the server rather than patching local state.
- **`LoginChallenge`** (interface) — the shape handed off by `useAuthStore().login()`'s `mfa` branch: `challenge`, `expiresAt`, `methods`, `defaultMethod`, and the form-originated `remember` flag. Both `challenge` and `remember` are absent for OAuth-originated logins.
- **`status` / `challenge` / `delivery` / `resendAvailableAt`** — the four core refs. `status` is `undefined` until first fetch; `challenge` is `undefined` outside the login step.
- **`secondsUntilResend`** — derived from `useCountdown(resendAvailableAt)`; the live ticking countdown.
- **`trackDelivery(delivery)`** — records a fresh `TwoFactorDelivery` and (re)starts the cooldown clock.
- **`applyResendCooldown(promise)`** — `.catch` wrapper that reads `retryAfter` from a `TWO_FACTOR_RESEND_TOO_SOON` 429, seeds `resendAvailableAt`, then rethrows. Applied to `setupMethod` and `sendLoginCode` (the two calls the cooldown can be answered to).
- **`fetchStatus()`** — loads the account's 2FA status (armed methods, addable methods, remaining backup codes).
- **`setupMethod(method, code?)`** — begins or restarts enrollment of one method. Returns the setup payload (TOTP `secret`/`otpauthUri` for device methods). Caller must hold the secret locally.
- **`sendMethodCode(method)`** — mails a code for an *armed* delivered method (proof-of-possession for a change operation).
- **`confirmMethod(method, code)`** — arms the pending method; refetches status so `status` is never stale.
- **`removeMethod(method, code)`** — drops one armed method; refetches status.
- **`disableAll(code)`** — drops every armed method and all backup codes; refetches status.
- **`regenerateBackupCodes(code)`** *(truncated in listing)* — mints a fresh set of ten backup codes.
- **`sendLoginCode` / `submitLoginCode`** *(truncated in listing)* — the login-time challenge send and submit actions.

## Relationships

- **`src/modules/account/composables/use-countdown.ts`** — imported as `useCountdown`; provides the ticking `secondsLeft` ref that drives `secondsUntilResend`. The store only sets the target timestamp (`resendAvailableAt`); the composable handles the interval.
- **`src/modules/account/stores/auth.ts`** — the `LoginOutcome` type is imported for the `mfa` branch handoff. In practice `useAuthStore().login()` writes its `mfa` result into this store's `challenge` ref before the view renders the code-entry step.
- **`src/modules/account/stores/profile.ts`** — `useProfileStore` is imported (presumably to read the account identity or refresh profile state after a 2FA status change).

## Notes

- **All writes use `forced: true`** on the `fetchAny` key. The toolkit caches keyed reads for an hour; without `forced` a second setup/remove/regenerate in one page-load would resolve from cache and never hit the API.
- **Secrets never live in the store.** The TOTP `secret`/`otpauthUri` from `setupMethod` and the one-time backup codes from `confirmMethod` are returned to the caller (`TwoFactorEnroll.vue`), which keeps them in a component-local `ref`. This mirrors the existing `api-keys`/`webhooks` convention.
- **Cooldown is always server-authoritative.** `resendAfter` comes from the API response or the 429's `Retry-After`; the client never invents its own delay. The only client-side logic is `Date.now() + seconds * 1000` to produce a wall-clock target for `useCountdown`.
- **Single-store rationale is documented inline:** enrollment, status, and login-challenge share the same underlying resource and cooldown, so splitting them would duplicate the `resendAfter` plumbing.
