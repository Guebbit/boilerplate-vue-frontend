---
source: tests/unit/app/reauth-dialog.spec.ts
sha256: 8e4d8cc1e911cc1bd918010671405686fe7202e4573a87734c9d6493b55e0c4b
generated_at: 2026-10-17T02:32:07.609767+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/reauth-dialog.spec.ts

## Purpose

Mounts the `ReauthDialog` component and verifies its full interaction contract once the reauth prompt store is open: password submit, OTP second-factor submit, email-code flow for password-less accounts, inline 422 error display, and cancel rejection. It exists because no other spec previously mounted this dialog — `step-up.spec.ts` drives the store directly to cover interceptor park/replay, leaving the dialog's own submit/cancel/error behavior untested until here.

## Key elements

- **`mountDialog()`** — Mounts `ReauthDialog` with vuetify, i18n, and a `VDialog` stub (simple `<slot/>` passthrough), avoiding the real dialog's portal/overlay behavior.
- **`settled(wrapper)`** — Chained two `nextRenderTick` calls: one for the prompt to open, one for the server's method list to arrive and the correct form to render.
- **`openForEmail()`** — Sets `reauthMethods` to `['email']`, mounts, opens the prompt, and waits two ticks; returns `{ wrapper, stepUp }` for the no-password describe block.
- **`describe('ReauthDialog')`** — Covers: no render when idle, password form appears on open, success resolves the step-up promise, 422 keeps dialog open with inline message, OTP field appears only for `otp` challenge, no OTP field for recency-only, cancel rejects with `'REAUTH_CANCELLED'`.
- **`describe('ReauthDialog — an account with no password')`** — Covers: email/code form replaces password, send-code button with cooldown, 429 `retryAfter` countdown, code submit payload, 422 wrong-code message (distinct from wrong-password), and the no-method dead-end state.
- **Mocks** — `reauth`, `reauthMethods`, `sendReauthCode`, `reauthing` are all `vi.fn()`/`ref` stubs injected via `vi.mock('@/infrastructure/session.ts')`. `reauthMethods` defaults to resolving `['password']`.

## Relationships

- **`tests/support/unit/mounted-vm.ts`** — Supplies `nextRenderTick`, the async render-settling utility used by every test to wait for Vue's reactivity to flush before asserting on the DOM.

## Notes

- `useReauthPromptStore` is the **real** store (backed by a fresh Pinia in `beforeEach`); mocking it would defeat the purpose since the dialog's entire job is to drive that store's open/close.
- `useSessionStore` is **mocked**; its `reauth()` internals belong to `session.spec.ts`.
- The 422-vs-other error-message branch is deliberately **excluded** here and lives in `reauth-dialog-error-message.spec.ts`, which needs an unstubbed `VDialog` and identity `t` — neither available in this file's stub setup.
- `loadLocale('en')` is awaited in `beforeEach` before any render, ensuring i18n strings are ready for text assertions.
- The cancel test asserts the promise rejects with the literal string `'REAUTH_CANCELLED'`, not an error class.
