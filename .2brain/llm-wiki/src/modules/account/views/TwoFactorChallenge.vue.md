---
source: src/modules/account/views/TwoFactorChallenge.vue
sha256: 6c51303a656b05e46dd0bdfdb903ce39256f41208601d7e59d1b7874de274637
generated_at: 2026-10-17T00:31:26.517981+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/TwoFactorChallenge.vue

## Purpose

The second step of the login flow: a public page where a visitor submits a one-time code (or a backup code) against a challenge that `Login.vue` opened. The challenge token itself is the credential — no session or auth state is required — so a visitor who lands here without one (reload, bookmarked URL) is redirected back to `Login`.

## Key elements

- **`handleSend`** — Resends a code via the selected delivery method; success shows a toast and starts the resend cooldown, failure is reported inline via `useBlockingError`.
- **`handleSubmit`** — Submits the typed code to the two-factor store; on success triggers `redirectAfterLogin`. A 429 (guess-budget exhausted) sets `lockedOut`, clears the challenge, and shows a terminal "locked out" panel with a back-to-login link.
- **`selectedMethod` / `activeMethod`** — Tracks which armed method is offered; defaults to the challenge's `defaultMethod` (cheapest for the visitor), falling back to the first method.
- **`usingBackupCode`** — UI-mode flag that switches the input label and `inputmode` between a numeric code and a text backup code; the server distinguishes the two by code shape.
- **`lockedOut`** — Terminal state that replaces the code form with an error alert and a link back to `Login`; persists after the challenge is cleared.
- **`onMounted` guard** — If no challenge is in the store, immediately `router.replace`s to `Login`; there is nothing to recover from here.
- **`onUnmounted`** — Calls `twoFactor.clearChallenge()` so a spent or abandoned challenge never survives to the next visit of this route.
- **Dual countdown** — `useExpiryCountdown` drives the visible challenge-expiry ticker (disabled submit when `≤ 0`); `useCountdownAnnouncement` drives a separate screen-reader `role="status"` that speaks only at 60 / 30 / 10 s and on expiry.
- **Two independent `useBlockingError` instances** — one for the resend button (`sendError`), one for the code form (`submitError`), so errors stay scoped to their respective controls.

## Relationships

- **`src/modules/account/stores/two-factor.ts`** — Primary state source. Reads `challenge`, `delivery`, `secondsUntilResend`, `loading` via `storeToRefs`; calls `sendLoginCode`, `submitLoginCode`, and `clearChallenge`.
- **`src/modules/account/composables/use-countdown.ts`** — Provides `useExpiryCountdown` (challenge-level countdown) and `useCountdownAnnouncement` (accessible 60/30/10 s announcements).
- **`src/modules/account/composables/use-method-label.ts`** — Resolves a method identifier to a human-readable label for the `v-select` and display.
- **`src/modules/account/composables/use-post-login-redirect.ts`** — Supplies `redirectAfterLogin()`, which routes the visitor to wherever they were headed before the login wall.
- **`src/modules/account/views/Login.vue`** — Upstream: opens the challenge this page answers. Downstream: this page redirects back to `Login` when no challenge exists (mount guard) or when locked out (explicit link).
- **`src/modules/account/tests/two-factor-challenge-view.spec.ts`** — Test suite covering this view's behavior.

## Notes

- The component name is declared in a separate non-`setup` `<script>` block because `<script setup>` cannot set `name`; this is required for devtools and `<KeepAlive>` compatibility.
- The visible challenge-expiry countdown is deliberately **not** a live region. Re-rendering `role="status"` every second was a known source of screen-reader spam ("299… 298… 297…"). The paired `.sr-only` `role="status"` paragraph is the only announced countdown, and it fires at 60 / 30 / 10 s and expiry only.
- A 429 on submit is treated as a **terminal** state for the challenge (guess budget exhausted), not a transient error: the challenge is cleared immediately and the page switches to the `lockedOut` template.
- `usingBackupCode` is a pure UI toggle; it does not change the API call. The server differentiates backup codes from regular codes by their shape.
- The resend button and the code-submit button have **separate** `useBlockingError` instances so that an error on one does not visually block the other.
