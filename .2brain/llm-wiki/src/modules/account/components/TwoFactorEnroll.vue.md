---
source: src/modules/account/components/TwoFactorEnroll.vue
sha256: e4f8c437a54a919e94ffa1f43c99f57483cb52bc34a15ce2c1bbac7f1457b5d1
signature: b691c70d6aa24caa72577c3bfb32a65a2ca57f8838f03cc1746239757eed0dd8
generated_at: 2026-11-10T03:23:21.458654+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/TwoFactorEnroll.vue

## Purpose

A single-method 2FA enrollment card. Renders the setup UI for one factor at a time — either a QR code + manual-entry secret (device method) or a "code sent to…" prompt with resend (delivered method) — plus a code-entry field to confirm. It is method-agnostic: it branches only on the `delivers` flag returned by the store, never on the method string itself.

## Key elements

- **`TwoFactorEnroll`** (default export) — stable `name` for devtools / `<KeepAlive>`; the `<script setup>` block cannot declare one itself.
- **Props: `method`, `initialSetup`** — `method` is the wire name to enroll; `initialSetup` (optional) lets a parent that already started setup (replace flow, second method) hand in the payload so this card skips its own mount call.
- **Emit: `close(backupCodes?)`** — signals the parent to close the dialog; carries one-time backup codes only when this armed the *first* factor.
- **`setup` (local ref)** — holds the `TwoFactorSetup` payload (TOTP secret, `otpauthUri`, `expiresAt`). Deliberately kept out of the store: it is shown once for the dialog's lifetime and never cached.
- **`qrCodeDataUrl`** — generated client-side via `qrcode.toDataURL` from `otpauthUri`; a `watch` with `immediate: true` re-renders on URI change.
- **`useExpiryCountdown` / `useCountdownAnnouncement`** — countdown for a delivered code's `expiresAt`; the announcement fires only at 60 / 30 / 10 s and on expiry (not every tick).
- **`useBlockingError` (shared instance)** — single inline error state for both **resend** and **confirm**, since both act on the same code field and neither closes the dialog on failure.
- **`handleResend`** — re-calls `setupMethod(method)`; the API contract treats "send" and "resend" identically.
- **`handleConfirm`** — calls `confirmMethod(method, code)`; on success emits `close` with optional `backupCodes`.
- **`closeAndClear`** — emits `close` then calls `abandonSetup()` to stop the resend-countdown `setInterval` that nothing else would clear.
- **Template branches** — `setup?.delivers === false` → QR + secret; `=== true` → sent-to text, expiry countdown, resend button. Both paths show the code form and `InlineErrorAlert`.

## Relationships

- **`ProfileTwoFactor.vue`** (parent) — renders this card per factor, passes `method` and (optionally) `initialSetup`, and listens for `close` to dismiss the dialog or advance to the backup-codes screen.
- **`two-factor.ts` store** — supplies actions (`setupMethod`, `confirmMethod`, `abandonSetup`) and reactive refs (`delivery`, `secondsUntilResend`, `sendingCode`, `confirmingCode`) via `storeToRefs`.
- **`use-countdown.ts`** — provides `useExpiryCountdown` (drives the visible ticking number) and `useCountdownAnnouncement` (drives the `role="status"` live-region text).
- **`two-factor-enroll-countdown.spec.ts`** — unit-tests the countdown / announcement behaviour exercised by this component.

## Notes

- **No method branching.** The component never inspects the `method` string; the `delivers` boolean from the store is the sole discriminant. Adding a new 2FA method requires no changes here.
- **Client-side QR generation.** The `otpauthUri` is sent to the browser once; the QR image is produced locally via `qrcode`. Generating it server-side would put the secret on the wire twice.
- **Countdown accessibility split.** The visible ticking number is intentionally *not* a live region (re-rendering `role="status"` every second floods screen readers). A separate `sr-only` `role="status"` element announces only at 60 / 30 / 10 s and on expiry.
- **`closeAndClear` cleanup.** Without calling `abandonSetup`, a cancelled or failed delivery would leave the resend `setInterval` ticking in the store for the rest of the session. The same call also re-syncs the factor list after a replace (which disarms before the new code is proved).
- **Setup-failure toast vs. inline error.** The initial `setupMethod` on mount uses a toast (the dialog closes immediately, leaving no surface for an inline alert). Resend and confirm failures use the shared `useBlockingError` inline alert because the card stays open.
- **Backup codes** are emitted upward on close and are never persisted to the store.
