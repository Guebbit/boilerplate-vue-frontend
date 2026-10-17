---
source: src/modules/account/components/TwoFactorEnroll.vue
sha256: 29d783f9114caaf814d6b664dd3ea0df29ca72a3409bf519b7a345f6d245a731
generated_at: 2026-10-17T00:17:21.362132+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/TwoFactorEnroll.vue

## Purpose

Renders the enrollment card for a single second-factor method (TOTP device or delivered code such as email). It branches only on `setup.delivers`: a QR code + manual-entry secret for device methods, a "code sent to…" prompt with resend for delivered methods, plus a code input field in both cases. It is method-agnostic — no logic inspects the `method` string.

## Key elements

- **Props** — `method` (wire name of the factor) and `initialSetup?` (a `TwoFactorSetup` the parent already holds for the code-proved / replace case; when absent the card calls `setupMethod` on mount).
- **`emit('close', backupCodes?)`** — signals the parent to close the dialog; carries one-time backup codes only when this armed the *first* factor.
- **`closeAndClear()`** — emits `close` *and* calls `twoFactor.abandonSetup()` to tear down the resend `setInterval` and re-sync server state (a replace disarms before the new code is proved).
- **`onMounted`** — either adopts `initialSetup` or fires `twoFactor.setupMethod(method)`; a failure here toasts and closes the dialog (no card to hold an inline alert).
- **`qrCodeDataUrl`** + `watch` on `setup.otpauthUri` — regenerates a client-side QR data-URL whenever the URI changes (`immediate: true` covers the mount case).
- **`useExpiryCountdown` / `useCountdownAnnouncement`** — countdown for the delivered code's `expiresAt`; the announcement speaks only at 60/30/10 s and expired, never every tick.
- **`useBlockingError`** — single shared instance for the code field; both `handleResend` and `handleConfirm` report into it instead of toasting, since neither closes the dialog on failure.
- **`handleResend`** — calls `setupMethod(method)` again (same call as the initial send).
- **`handleConfirm`** — calls `confirmMethod(method, code)`, then emits `close` with `result?.backupCodes`.

## Relationships

- **`src/modules/account/stores/two-factor.ts`** — primary data source; reads `delivery`, `secondsUntilResend`, `sendingCode`, `confirmingCode` via `storeToRefs`, and calls `setupMethod`, `confirmMethod`, `abandonSetup`.
- **`src/modules/account/composables/use-countdown.ts`** — provides `useExpiryCountdown` (visible ticking number) and `useCountdownAnnouncement` (screen-reader-safe 60/30/10/expired speech).
- **`src/modules/account/components/ProfileTwoFactor.vue`** — parent; renders this card inside its enrollment dialog, supplies `method` / `initialSetup`, and handles the `close` emit (including the backup-codes hand-off).
- **`src/modules/account/tests/two-factor-enroll-countdown.spec.ts`** — exercises the countdown / expiry display logic in isolation.

## Notes

- **Secrets stay local.** The `setup` ref (TOTP secret, `otpauthUri`) lives only in component state for the dialog's lifetime — never in the Pinia store. Backup codes follow the same "never park a secret in a store" idiom: they are emitted out and discarded.
- **QR is generated client-side** (`qrcode` library). Generating it server-side would transmit the secret over the wire a second time.
- **Dual `<script>` blocks.** The separate Options-API block exists solely to set `name: 'TwoFactorEnroll'` for `<KeepAlive>` and DevTools; `<script setup>` cannot declare a name.
- **Accessibility split.** The visible countdown `<p>` is intentionally *not* a live region (re-rendering `role="status"` every second floods screen readers). A separate `sr-only` `role="status"` paragraph carries the throttled announcement.
- **`initialSetup` prop** exists for the code-proved flow (replace or second method) where the parent already called `setupMethod` and must keep a wrong code in the prompt that asked for it rather than closing the dialog.
