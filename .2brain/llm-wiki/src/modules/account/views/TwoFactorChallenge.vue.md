---
source: src/modules/account/views/TwoFactorChallenge.vue
sha256: 98cbf605786983a1034ec736ec315e15e345baeae29cafd4fd3006c87ce65c08
generated_at: 2026-10-02T14:54:05.775586+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/TwoFactorChallenge.vue

## Purpose

Second step of the login flow: presents a 2FA code-entry form (or backup-code entry) against the challenge that `Login.vue` opened. The page is a public route — the challenge token itself is the credential, not a session — so arriving here without an active challenge (reload, bookmarked URL) bounces the visitor back to `Login`.

## Key elements

- **`handleSend`** — Calls `twoFactor.sendLoginCode(selectedMethod)` to deliver a fresh code via the chosen method. Success fires a toast and starts the resend cooldown; failure surfaces via the dedicated `sendError` blocking-alert.
- **`handleSubmit`** — Calls `twoFactor.submitLoginCode(code)`. On success, hands off to `redirectAfterLogin()`. On a 429 (`isRateLimited`), sets `lockedOut`, clears the challenge, and renders a terminal "locked out" state with a link back to `Login`.
- **`selectedMethod` / `activeMethod`** — Tracks which armed 2FA method is currently offered. Initialised on mount to `challenge.defaultMethod` (fallback: first method). Drives the method `<v-select>`, the send button, and the input's `inputmode`.
- **`usingBackupCode`** — UI-only toggle that switches the text field's label and `inputmode` from numeric to text. The server distinguishes a backup code by its shape, not a separate endpoint.
- **`secondsUntilChallengeExpires`** (via `useExpiryCountdown`) — Counts down the *challenge* expiry (not the delivered code's shorter TTL). Disables the submit button at zero.
- **`challengeExpiryAnnouncement`** (via `useCountdownAnnouncement`) — Screen-reader-only live region that speaks only at 60 / 30 / 10 s and on expiry (FA82), avoiding per-second flooding.
- **`lockedOut`** — Terminal flag set on a 429. Keeps the page rendered (to explain *why* and offer the way back) even after the challenge is cleared.
- **`onUnmounted(twoFactor.clearChallenge)`** — Ensures a spent or abandoned challenge never leaks into the next visit.

## Relationships

- **`Login.vue`** — `TwoFactorChallenge` navigates *to* `Login` in two places: on mount when no challenge exists (`router.replace`) and via a persistent "Back to login" `RouterLink`. Conversely, `Login` is the upstream view that *creates* the challenge this page consumes.
- **`usePostLoginRedirect`** composable — On successful code submission, delegates the post-login navigation (returning the user to their pre-auth destination) to this shared composable.
- **`useTwoFactorStore`** (Pinia) — Source of `challenge`, `delivery`, `secondsUntilResend`, `loading`, and the `sendLoginCode` / `submitLoginCode` / `clearChallenge` actions.
- **`useExpiryCountdown` / `useCountdownAnnouncement`** (account composables) — Provide the challenge countdown and its accessible announcement.
- **`useMethodLabel`** composable — Translates raw method identifiers into user-facing labels for the `<v-select>`.
- **`useBlockingError`** (infrastructure) — Instantiated twice (send vs. submit) to give each action its own inline error slot.
- **`isRateLimited`** (infrastructure/errors) — Detects the 429 that triggers the locked-out terminal state.

## Notes

- **Two separate blocking-error instances.** Send and submit each get their own `useBlockingError` so their inline `InlineErrorAlert` components never clobber each other.
- **Challenge expiry ≠ resend cooldown.** `secondsUntilChallengeExpires` gates the *submit* button; `secondsUntilResend` gates the *send* button. They are independent timers.
- **Accessibility (FA82).** The visible countdown `<p>` is intentionally *not* a live region. The paired `role="status"` paragraph speaks only at threshold seconds to prevent screen-reader flooding.
- **Backup code is not a separate field.** The server infers code type from shape; the client only toggles label and `inputmode`.
- **Terminal lockout is not recoverable in-place.** Once `lockedOut` is true the challenge is cleared; the only path forward is a new login. The page stays mounted to explain this.
