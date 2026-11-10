---
source: src/app/components/AppVerificationBanner.vue
sha256: 604eaa8efe85b316132a623a64f2cb7dc0dba33dc35d15171c3a73c9c71cffdf
signature: e94abd903fd4cee9ccd273b9c68d2b6a07caeff01c7ae9b13013606cf76a0160
generated_at: 2026-11-10T02:51:33.195292+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/AppVerificationBanner.vue

## Purpose

A shell-level Vuetify alert that prompts a signed-in but unverified user to re-send their email-verification link. Because it is mounted in the app shell (outside route views), it appears on every page, catching the visitor early rather than at checkout where an unverified address would hard-fail (`EMAIL_NOT_VERIFIED`).

## Key elements

- **`AppVerificationBanner`** (default export) — Stable SFC `name` for devtools and `<KeepAlive>`; required because `<script setup>` cannot declare one itself.
- **`handleResendVerification`** — Calls `requestEmailVerification()`, starts the server-supplied cooldown on success, and on error extracts the retry-after via `emailVerifyResendRetryAfter(error)` before delegating to `notifyErrorMessages`.
- **`startCooldown(seconds)`** — Kicks off a 1-second `setInterval` that decrements `cooldown` to zero; clears any prior ticker first. No-op for `seconds <= 0`.
- **`cooldown`** (ref) — Seconds remaining before the resend button re-enables; also drives the button label (`verification-banner.button-resend-wait`).
- **`viewer`** (from `useSessionStore` via `storeToRefs`) — The lightweight per-page session projection; the banner renders only when `viewer && !viewer.verified`.
- **`onUnmounted` hook** — Clears the interval so a countdown never leaks after the banner is destroyed (it outlives any single route because it lives in the shell).

## Relationships

- **`src/infrastructure/utils/logger.ts`** — No direct import or call-site is visible in this component's source. The coupling is indirect at most (e.g., the API layer in `email-verification.ts` may log), not a direct dependency of this file.

## Notes

- The cooldown value is **always** taken from the server response (`resendAfter` or the 429 `Retry-After`). The component never invents its own delay; a client-side guess would eventually desynchronise from the server's window and allow a 429 the user already "waited out."
- The first press after signup can legitimately hit the server's cooldown (the first verification link was already sent during registration). The catch path therefore *does* call `startCooldown` with the error's retry-after rather than leaving the button enabled.
- The banner is a `v-alert` with `v-if`, so it is fully removed from the DOM once `viewer.verified` becomes true — no CSS hiding, no lingering timers (the `onUnmounted` cleanup handles the interval).
