---
source: src/modules/account/components/TwoFactorEnroll.vue
sha256: 129e1af3bfc65c500d48ea5bc9825cd5c880dcd89c919c5c080f089a21fe6951
generated_at: 2026-10-02T14:46:12.861909+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/TwoFactorEnroll.vue

## Purpose

Single-method 2FA enrollment card. On mount it requests a setup payload (or receives one via `initialSetup`), then renders one of two halves — a QR code + manual secret for a device method, or a "code sent to …" prompt with a resend button for a delivered method — plus a shared code-entry field. It is fully method-agnostic: the only branch point is the boolean `delivers` flag from the server.

## Key elements

- **`defineProps`** — `method: string` (wire name) and optional `initialSetup?: TwoFactorSetup` (pre-held setup for the code-proved / replace case).
- **`defineEmits`** — `close(backupCodes?: string[])`; fires on both success and abandon. `backupCodes` is present only when this enrollment armed the *first* factor.
- **`setup` (local `ref`)** — holds the `TwoFactorSetup` response *outside the store* because it carries the TOTP secret / `otpauthUri`.
- **`closeAndClear()`** — emits `close` and calls `twoFactor.abandonSetup()` to stop the store's resend `setInterval` and refresh server status.
- **`onMounted`** — either assigns `initialSetup` or calls `twoFactor.setupMethod(method)`; failures here toast and close the dialog.
- **`qrCodeDataUrl` + `watch`** — generates the QR data-URL client-side from `otpauthUri` via the `qrcode` library; no server-rendered image is ever fetched.
- **`useExpiryCountdown` / `useCountdownAnnouncement`** — drives the visible countdown number and the separate screen-reader announcement (60 / 30 / 10 s / expired only, per FA82).
- **`code` (ref)** — the user-typed verification code.
- **`useBlockingError` (shared instance)** — one `codeError` / `reportCodeError` / `clearCodeError` triple shared by both resend and confirm, since both act on the same code field.
- **`handleResend`** — re-calls `twoFactor.setupMethod(method)`; on failure reports inline via the shared blocking error.
- **`handleConfirm`** — calls `twoFactor.confirmMethod(method, code)`; on success emits `close` with optional `backupCodes`; on failure reports inline.
- **Template** — Vuetify `v-card` with conditional QR/secret vs. delivery-info sections, a `novalidate` form with a `v-text-field`, an `InlineErrorAlert`, and cancel / confirm action buttons.

## Relationships

- **`src/infrastructure/utils/logger.ts`** (listed graph neighbor) — no direct import or reference is visible in this file's source; interaction, if any, is transitive through `errors.ts` or `use-blocking-error.ts`.

## Notes

- **Secrets never touch the store.** The `TwoFactorSetup` payload (TOTP secret, `otpauthUri`) lives only in the local `setup` ref for the dialog's lifetime. Same idiom as `api-keys` / `webhooks`.
- **Error presentation is context-dependent.** Mount-time `setup` failure → toast (dialog closes, no place for an inline alert). Resend / confirm failure → inline `InlineErrorAlert` via the shared `useBlockingError`. See `docs/theory/request-flow.md`.
- **Resend countdown cleanup.** `closeAndClear` must call `abandonSetup()`; otherwise the store's `setInterval` for the resend timer keeps ticking for the rest of the session.
- **Accessibility (FA82).** The visible ticking seconds number is deliberately *not* a live region. The paired `role="status"` sr-only paragraph announces only at 60 / 30 / 10 s and on expiry to avoid flooding screen readers.
- **`initialSetup` prop** exists for the "code-proved" enrollment path (replacing an existing method or adding a second factor), where the parent has already started the setup and a wrong code must stay in the prompt rather than close the dialog.
