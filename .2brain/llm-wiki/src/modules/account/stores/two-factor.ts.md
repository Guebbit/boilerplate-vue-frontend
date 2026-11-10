---
source: src/modules/account/stores/two-factor.ts
sha256: cb6590299b7a9f59bfad9528b4e4b166b7ac429d7c321cdd64de2c4519e041c4
signature: bbfa3fde68a75882e85a94fd7e0a40696060d4863077d270a7de641805d127a2
generated_at: 2026-11-10T03:28:36.744090+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/stores/two-factor.ts

## Purpose

Single Pinia store (Composition API) covering every 2FA surface on the account: the armed/available method status, the enrollment machine (setup → confirm → backup codes), and the login-time challenge (send → submit). It exists as one store rather than three because enrollment and the login challenge share the same `GET /account/2fa` endpoint and the same server-driven resend cooldown.

## Key elements

- **`useAccountTwoFactorStore`** — the store, exposed via `defineStore('account-two-factor', …)`.
- **`status`** (`ref<TwoFactorStatus | undefined>`) — armed methods, addable methods, backup-code count. `undefined` until `fetchStatus` resolves.
- **`challenge`** (`ref<LoginChallenge | undefined>`) — the live login-time challenge handed off by `auth.ts`'s `login()` mfa branch. Absent outside the 2FA login step; for OAuth-originated challenges both `challenge` and `remember` are absent (token rides in an httpOnly cookie).
- **`delivery` / `resendAvailableAt`** — last code delivery and its epoch-ms deadline.
- **`secondsUntilResend`** — countdown from the server's `resendAfter`, driven by `useCountdown(resendAvailableAt)`.
- **`trackDelivery(next)`** — records a delivery and (re)starts the cooldown.
- **`applyResendCooldown(promise)`** — `.catch` wrapper that, on a `TWO_FACTOR_RESEND_TOO_SOON` 429, sets `resendAvailableAt` from the 429's own `retryAfter`, then rethrows.
- **`fetchStatus()`** — `GET /account/2fa`; populates `status`.
- **`setupMethod(method, code?)`** — begins (or restarts) enrollment; wraps in `applyResendCooldown`; caller holds the TOTP secret locally.
- **`sendMethodCode(method)`** — sends a code for an already-armed delivered method; starts cooldown.
- **`confirmMethod(method, code)`** — arms the pending method; refetches status afterward.
- **`removeMethod(method, code)`** / **`disableAll(code)`** — drop one / all armed methods; refetch status.
- **`regenerateBackupCodes(code)`** — mints a fresh set of ten codes; caller holds them locally for the one-time reveal.
- **`sendLoginCode` / `submitLoginCode`** (truncated) — login-challenge send and submit; `submitLoginCode` forwards the `remember` flag captured at form time.

## Relationships

- **`src/modules/account/stores/auth.ts`** — `login()`'s `mfa` branch writes into this store's `challenge`; the `LoginOutcome` type is imported from this file.
- **`src/modules/account/views/Login.vue`** — origin of the non-OAuth challenge; supplies the `remember` checkbox value that is carried into `LoginChallenge.remember`.
- **`src/modules/account/views/OAuthCallback.vue`** — origin of the OAuth challenge (no `challenge`/`remember` fields; token is an httpOnly cookie).
- **`src/modules/account/views/TwoFactorChallenge.vue`** — renders `challenge`, calls `sendLoginCode` / `submitLoginCode`.
- **`src/modules/account/components/TwoFactorEnroll.vue`** — drives the enrollment machine (`setupMethod`, `confirmMethod`, `sendMethodCode`); holds TOTP secret and one-time backup codes in component-local refs.
- **`src/modules/account/components/ProfileTwoFactor.vue`** — displays `status`, triggers `removeMethod` / `disableAll` / `regenerateBackupCodes`.
- **`src/modules/account/composables/use-countdown.ts`** — provides the `useCountdown` primitive that powers `secondsUntilResend`.
- **`src/modules/account/stores/profile.ts`** / **`src/modules/account/stores/deletion-restore.ts`** — imported for account-context lookups (profile data, deletion-restore window).
- **`src/modules/account/tests/two-factor-store.spec.ts`** / **`src/modules/account/tests/two-factor-challenge-view.spec.ts`** — unit tests for the store and the challenge view.

## Notes

- **All writes use `{ forced: true }`** on `fetchAny` to bypass the toolkit's 1-hour keyed-read cache. Without it, a second setup/remove/regenerate in one page load would resolve from cache and never hit the API.
- **Secrets are never persisted in store state.** The TOTP `secret`/`otpauthUri` from `setupMethod` and the one-time backup codes from `confirmMethod` / `regenerateBackupCodes` are returned to the caller, which holds them in a component-local ref (same idiom as `api-keys`/`webhooks`).
- **The resend cooldown is always server-driven.** It is seeded either from a successful delivery's `resendAfter` or from a 429's `retryAfter` header — never a client-invented constant — so it cannot disagree with the rate limiter.
- **`applyResendCooldown` only wraps `setupMethod` and `sendLoginCode`**, the two calls that can produce a `TWO_FACTOR_RESEND_TOO_SOON` 429.
- **`confirmMethod` and `removeMethod`/`disableAll`/`regenerateBackupCodes` all refetch `status` after the write**, so the store's `status` never lags what the server just changed.
