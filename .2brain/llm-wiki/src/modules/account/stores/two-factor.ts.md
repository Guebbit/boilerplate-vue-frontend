---
source: src/modules/account/stores/two-factor.ts
sha256: fa16601a92f5ef3a24c6199dca738a183c12d5fbf30d6b1ddb72e22eda23c1d7
generated_at: 2026-10-17T00:19:49.733162+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/stores/two-factor.ts

## Purpose

A single Pinia store (Composition API, id `accountTwoFactor`) that owns all client-side 2FA state and actions: the account's armed/available methods, the enrollment machine (setup → confirm → backup codes), and the login-time challenge (send code → submit code). The shared `resendAfter` cooldown lives here so both the login challenge and the enrollment "send me a code" step read the same server-driven number.

## Key elements

- **`useTwoFactorStore`** – exported store. Uses `useStructureRestApi` from `@guebbit/vue-toolkit` for the `loading` / `fetchAny` plumbing.
- **`LoginChallenge`** (interface) – shape of the login-time challenge plus the `remember` flag the login form carried in. Both `challenge` and `remember` are absent for OAuth-originated challenges.
- **`status`** / **`challenge`** / **`delivery`** / **`resendAvailableAt`** – the four reactive refs backing the store.
- **`secondsUntilResend`** – countdown exposed via `useCountdown(resendAvailableAt)`.
- **`trackDelivery`** – records a delivery and (re)starts the resend cooldown.
- **`applyResendCooldown`** – wraps a promise; on a `TWO_FACTOR_RESEND_TOO_SOON` 429 it starts the cooldown from the `retryAfter` header *before* rethrowing.
- **`fetchStatus`** – `GET /account/2fa`; populates `status`.
- **`setupMethod(method, code?)`** – begins or restarts enrollment; calls `trackDelivery` when the response carries delivery fields.
- **`sendMethodCode(method)`** – sends a code to an armed delivered method.
- **`confirmMethod(method, code)`** – arms the pending method, then re-fetches status.
- **`removeMethod(method, code)`** / **`disableAll(code)`** – remove one or all armed methods, then re-fetch status.
- **`regenerateBackupCodes`** (truncated in source) – mints a fresh backup-code set.

## Relationships

- **`stores/auth.ts`** – imports the `LoginOutcome` type; `useAuthStore().login()`'s `mfa` branch is the upstream that populates `challenge`.
- **`composables/use-countdown.ts`** – provides the `secondsUntilResend` countdown primitive.
- **`stores/profile.ts`** – imported as `useProfileStore` (used for account context).
- **`views/Login.vue`** – the form whose `remember` choice is carried into `LoginChallenge` before the challenge step begins.
- **`views/OAuthCallback.vue`** – origin of the `beginOAuthChallenge` path where `challenge` and `remember` are both absent.
- **`views/TwoFactorChallenge.vue`** – consumes `challenge`, `secondsUntilResend`, and the send/submit actions during login.
- **`components/TwoFactorEnroll.vue`** – calls `setupMethod` / `confirmMethod`; holds the TOTP secret and one-time backup codes in component-local refs rather than in this store.
- **`tests/two-factor-store.spec.ts`** – unit tests for the store.
- **`tests/two-factor-challenge-view.spec.ts`** – tests the login-challenge view against this store.

## Notes

- **Every write action passes `{ forced: true }`** to `fetchAny`. Without it the toolkit's one-hour keyed cache would serve a stale response on a second setup/remove/regenerate within the same page load.
- **Secrets never live in the store.** The TOTP `secret`/`otpauthUri` from `setupMethod` and the one-time backup codes from `confirmMethod` are returned to the caller, which parks them in a component-local ref (same idiom used by `api-keys` and `webhooks`).
- **The resend cooldown is always server-sourced** — either the `resendAfter` field in the response or the `retryAfter` on a 429. It is never a client-invented constant.
- **`confirmMethod` re-fetches status** after confirming so `status` always reflects the server's post-arm state.
- **OAuth challenges carry no `challenge` string and no `remember` flag**; the token travels in an httpOnly cookie read by the backend, so this store's login-challenge fields are both `undefined` in that flow.
- One store by design: status, enrollment, and login challenge all touch the same `GET /account/2fa` and share the resend cooldown, so splitting them into three stores would duplicate state.
