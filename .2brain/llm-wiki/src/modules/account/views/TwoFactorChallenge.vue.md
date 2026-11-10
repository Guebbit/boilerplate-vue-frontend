---
source: src/modules/account/views/TwoFactorChallenge.vue
sha256: a58fac0d5ac1ff6f5d3c0278851560a101df717e0475f8b6c7f7bd45cfd65fa5
signature: a58fac0d5ac1ff6f5d3c0278851560a101df717e0475f8b6c7f7bd45cfd65fa5
generated_at: 2026-11-10T03:49:02.518611+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/TwoFactorChallenge.vue

## Purpose

The second step of the login flow: presents a code-entry form (or backup-code entry) against a two-factor challenge opened by `Login.vue`. Because the challenge token itself is the credential (not a session), the page is a public route that redirects back to `Login` if no live challenge is present. It also handles the terminal "locked out" state when the per-challenge guess budget (HTTP 429) is exhausted.

## Key elements

- **`TwoFactorChallengePage`** (named component) — stable `name` for devtools / `<KeepAlive>`; required because `<script setup>` cannot declare one.
- **`selectedMethod` / `activeMethod`** — the currently armed 2FA method (TOTP, SMS, email, …) chosen from `challenge.methods`; defaults to `challenge.defaultMethod` on mount.
- **`handleSend`** — sends a fresh code via the selected delivered method; success shows a toast and starts the resend cooldown; failure is reported through a dedicated `useBlockingError` instance (`sendError`).
- **`handleSubmit`** — submits the typed code against the live challenge. On success redirects via `redirectAfterLogin()`, or to `AccountRestoreChallenge` if the outcome is `'deletion-pending'`. On 429, sets `lockedOut` and clears the challenge. Other errors are reported via a second `useBlockingError` instance (`submitError`).
- **`secondsUntilChallengeExpires`** (from `useExpiryCountdown`) — counts down the challenge's own `expiresAt`, which is what actually blocks further submissions.
- **`challengeExpiryAnnouncement`** (from `useCountdownAnnouncement`) — screen-reader-only live region that speaks at 60/30/10 s and on expiry, avoiding per-second noise.
- **`usingBackupCode`** — UI toggle that changes the label and `inputmode`; the server distinguishes backup from regular codes by shape, not by a separate field.
- **`onUnmounted(twoFactor.clearChallenge)`** — ensures a spent or abandoned challenge does not persist into the next visit.

## Relationships

- **`src/modules/account/stores/two-factor.ts`** — primary data source. Provides `challenge`, `delivery`, `secondsUntilResend`, `loading` (via `storeToRefs`), and the actions `sendLoginCode`, `submitLoginCode`, `clearChallenge`.
- **`src/modules/account/composables/use-countdown.ts`** — supplies `useExpiryCountdown` (challenge TTL) and `useCountdownAnnouncement` (ARIA live-region text) for the challenge countdown.
- **`src/modules/account/composables/use-method-label.ts`** — translates a raw method identifier into a human-readable label for the `<v-select>` and intro text.
- **`src/modules/account/composables/use-post-login-redirect.ts`** — provides `redirectAfterLogin()`, the same destination logic a plain login uses after the 2FA step succeeds.
- **`src/modules/account/views/Login.vue`** — the page that *opens* the challenge this view answers. This view redirects back to `Login` on missing challenge, locked-out recovery, or the "back to login" links.
- **`src/modules/account/tests/two-factor-challenge-view.spec.ts`** — unit/integration tests for this component.

## Notes

- Two **separate** `useBlockingError` instances are used: one for the send/resend button and one for the submit form. They are intentionally independent so each control's blocked state is scoped to its own UI region.
- The visible ticking countdown (`secondsUntilChallengeExpires`) is **not** a live region; re-rendering `role="status"` every second was a prior source of screen-reader noise. The paired `<p role="status" class="sr-only">` element handles announcements at safe intervals only.
- A 429 on submit is treated as terminal for the current challenge: `lockedOut` is set, the challenge is cleared, and the only exit is a fresh login. The page stays mounted in this state to explain *why* and offer the back-link.
- The `autocomplete="one-time-code"` and `inputmode` swap (`numeric` → `text` for backup codes) are deliberate mobile/keyboard hints; the server does not care which mode was used.
- The route is public by design — there is no session token at this point; the challenge ID in the store *is* the credential.
