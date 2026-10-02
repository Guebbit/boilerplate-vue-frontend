---
source: src/app/components/AppVerificationBanner.vue
sha256: d327a26d03e576685c1b5a4120ae31d552d1ed7c9ae9bf3aa1616e64e8198e45
generated_at: 2026-10-02T11:45:36.114586+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/AppVerificationBanner.vue

## Purpose

A persistent "please verify your email" warning banner that mounts in the app shell and rides every page. It exists so an unverified visitor sees the prompt immediately rather than only discovering the `EMAIL_NOT_VERIFIED` rejection at checkout. The banner is visible only when a signed-in viewer exists and their `verified` flag is falsy.

## Key elements

- **`cooldown` / `ticker`** — Reactive seconds counter and its `setInterval` handle. Driven exclusively by the server's `resendAfter` value; cleared on reaching zero and on unmount.
- **`startCooldown(seconds)`** — (De)activates the countdown from a server-supplied number. No-ops when `seconds <= 0`.
- **`handleResendVerification()`** — The banner's single action. Calls `requestEmailVerification()` from the session store; on success starts a cooldown and shows a toast; on failure extracts the server's retry-after via `emailVerifyResendRetryAfter(error)` and dispatches error toasts through `notifyErrorMessages`.
- **Template** — A Vuetify `v-alert` (tonal warning) with an inline `v-btn` for resend. Button is disabled while `cooldown > 0`; label switches to a countdown string. Guarded by `v-if="viewer && !viewer.verified"`.

## Relationships

- **`src/infrastructure/session.ts`** — Provides `useSessionStore` (source of `viewer`, `requestEmailVerification`) and the `emailVerifyResendRetryAfter` helper used to read the server's retry window from error payloads.
- **`src/infrastructure/utils/errors.ts`** — `notifyErrorMessages` formats and dispatches error toasts.
- **`src/infrastructure/utils/logger.ts`** — Listed as a graph neighbor but not directly imported or referenced in this file's visible code.

## Notes

- The cooldown is **never** client-chosen. The endpoint returns `resendAfter` (or a 429/409 error carrying a retry window), and the UI trusts that number. Inventing a local constant would eventually desynchronise with the server.
- `ticker` is cleared in two places (reaching zero *and* `onUnmounted`). Because the banner lives in the shell it outlives individual route components, so the unmount guard matters for full navigation-away or HMR scenarios.
- The component has no `<style>` block; appearance is entirely Vuetify class-driven (`rounded-0`, `density="compact"`, tonal variant).
- i18n keys are prefixed `verification-banner.*` (message, button-resend, button-resend-wait, sent).
- `data-test` attributes (`verify-banner`, `verify-resend`) are present for e2e selectors.
