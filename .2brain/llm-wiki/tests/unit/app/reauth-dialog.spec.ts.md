---
source: tests/unit/app/reauth-dialog.spec.ts
sha256: 0eccf3b9c0924ec600ec4b69abb949a2f5210ba97864d129f688e8369d204af7
signature: 33f4af022f3acc39b6b11f52820bc27d97294ca39792c21eb709a2bf1f3f9e2d
generated_at: 2026-11-10T07:48:52.424213+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/reauth-dialog.spec.ts

## Purpose

Unit tests for the `ReauthDialog` component's own UI responsibilities: what it renders for each challenge method, how it submits the form, how it displays inline errors on failure, and how it resolves or rejects the pending step-up promise. This is the "dialog side" of re-authentication, complementing `step-up.spec.ts` (interceptor park/replay) and `reauth-dialog-error-message.spec.ts` (422-vs-else wording in isolation).

## Key elements

- **`reauth`, `reauthMethods`, `sendReauthCode`, `reauthing`** — `vi.fn` stubs wired into a `vi.mock('@/infrastructure/reauth.ts')` block, replacing the real reauth store with controllable behavior.
- **`mountDialog()`** — mounts `ReauthDialog` with `vuetify`, `i8n`, and a `VDialog` stub (`<div><slot/></div>`).
- **`settled(wrapper)`** — chains two `nextRenderTick` calls: one for the prompt to open, one for the async method list to arrive and the correct form to render.
- **`openForEmail()`** — helper that re-mocks `reauthMethods` to `['email']`, mounts, opens the prompt, and returns the wrapper + step-up promise.
- **`describe('ReauthDialog')`** — covers: idle (nothing rendered), password prompt appearance, successful submit resolves step-up, 422 reject shows inline error and stays open, OTP second-factor field + combined payload, no code field for recency-only, cancel rejects with `REAUTH_CANCELED`.
- **`describe('ReauthDialog — an account with no password')`** — covers: email-code form (no password field), send-code + cooldown countdown, 429 `retryAfter` reflected in countdown + message, code submit resolves step-up, 422 says "code is not right" (not "password"), and no-method dead-end.

## Relationships

- **`tests/support/unit/mounted-vm.ts`** — provides `nextRenderTick`, which every test uses to await Vue's render cycle after state changes or DOM triggers. This is the sole import from the support directory.

## Notes

- `useReauthPromptStore` is the **real** Pinia store (created via `createPinia()` in `beforeEach`); it is deliberately *not* mocked because the dialog's wiring to open/close it is exactly what these tests exercise.
- `useReauthStore` **is** mocked — its `reauth()` network call belongs to `reauth.spec.ts`.
- The 422-vs-other error-message branch is **not** asserted here except for the fixed "That password is not right." / "That code is not right" strings. The full branch logic (raw-message fallback, etc.) requires a real `VDialog` and an identity `t`, and lives in `reauth-dialog-error-message.spec.ts`.
- `VDialog` is stubbed to a bare slot; no Vuetify dialog open/close transitions are tested.
- In cases where the test does not assert on the step-up promise's outcome, the `requestStepUp()` call is fire-and-forget with `.catch(() => undefined)` — a cancel click will reject it, and that rejection is expected noise, not a failure.
- The `settled()` double-tick is load-bearing: skipping the second tick means the form for the selected method has not yet rendered, and queries for `[data-test="reauth-dialog-otp"]` etc. will fail.
