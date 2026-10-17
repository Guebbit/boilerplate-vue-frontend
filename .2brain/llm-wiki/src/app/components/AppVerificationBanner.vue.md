---
source: src/app/components/AppVerificationBanner.vue
sha256: f61329a995a7dbe179bbbf7c65bbf0e7d14c5cc8541cec5a20d9cbadddd0557c
generated_at: 2026-10-17T00:05:23.482447+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/AppVerificationBanner.vue

## Purpose

A warning banner displayed on **every** page (mounted in the app shell) when the signed-in viewer has an unverified email address. It exists because the checkout flow rejects unproved addresses (`EMAIL_NOT_VERIFIED`), and surfacing the issue only at the point of sale would be too late. Provides a single action: re-send the verification email, gated by a server-driven cooldown.

## Key elements

- **`handleResendVerification()`** — Calls `requestEmailVerification()` from the session store. On success, starts the cooldown and shows a toast. On error (e.g. 429 during the server's own resend window), extracts a retry-after value and still starts the countdown, then surfaces the error via `notifyErrorMessages`.
- **`startCooldown(seconds)`** — Sets the `cooldown` ref to the given value and drives a 1-second `setInterval` that decrements it to zero, re-enabling the button.
- **`cooldown` ref** — Controls the button's `:disabled` state and swaps the button label between a countdown and a plain "resend" string.
- **Template (`v-alert`)** — Conditional on `viewer && !viewer.verified`; renders a Vuetify `v-alert` (warning/tonal) with an appended `v-btn` for the resend action. Exposed via `data-test` attributes (`verify-banner`, `verify-resend`).
- **Named component block** — Declares `name: 'AppVerificationBanner'` in a separate `<script>` block, required because `<script setup>` cannot set a component name itself; needed for `<KeepAlive>` and devtools.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — Listed as a graph neighbor, but no direct import of this module appears in the file's source. The visible error-reporting path goes through `notifyErrorMessages` (from `@/infrastructure/utils/errors.ts`); any coupling to the logger is indirect.
- **`@/infrastructure/session.ts`** — Source of the `viewer` ref, the `requestEmailVerification()` action, and the `emailVerifyResendRetryAfter()` helper used to extract a retry window from error responses.
- **`@guebbit/vue-toolkit` (`useNotificationsStore`)** — Provides `addMessage` for toast output.
- **`vue-i18n`** — All user-facing copy is translated via `t('verification-banner.*')`.

## Notes

- The cooldown is **always** taken from the server (the `resendAfter` field in the success response, or the retry-after in a 429 error). The client never invents its own duration, preventing drift from the endpoint's internal window.
- Because the banner is shell-mounted and persists across route changes, the `setInterval` ticker is cleaned up in `onUnmounted` and also cleared when the countdown reaches zero.
- `viewer` is the session store's lightweight shell projection (hydrated on every page load), not the account module's full record which is fetched only on the profile page.
- Two `<script>` blocks are intentional and required: the plain block for the stable `name`, the `<script setup>` block for all logic.
