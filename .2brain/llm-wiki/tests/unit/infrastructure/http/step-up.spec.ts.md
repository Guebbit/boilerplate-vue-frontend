---
source: tests/unit/infrastructure/http/step-up.spec.ts
sha256: 48421e28025bea6e7b4701262053694db12669ddcb4e4913be5ed200c7ebfeee
generated_at: 2026-10-17T02:37:14.441405+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/step-up.spec.ts

## Purpose

Unit-tests the `REAUTH_REQUIRED` step-up (park-and-replay) mechanics of the HTTP interceptor. It uses MSW to stub a real HTTP server and drives the flow through the actual interceptor chain (via `orvalMutator`) rather than mocking the interceptor internals, because a broken park/retry silently hangs a request or lets an un-stepped-up request through. The reauth dialog is never mounted; its outcome is driven directly through `useReauthPromptStore()`.

## Key elements

- **`server`** — MSW `setupServer` instance that answers `POST /checkout` on `http://api.test`, returning either a `REAUTH_REQUIRED` 401 or a 200 depending on the mutable `scenario` object.
- **`loadHttp()`** — Resets modules, stubs `VITE_API_URL` to the test origin, and dynamically re-imports `@/infrastructure/http` so each test gets a fresh interceptor instance.
- **`waitForPrompt()`** — Uses `vi.waitFor` to poll until `useReauthPromptStore().isOpen` is `true`, accounting for microtask delays in the interceptor's `requestStepUp()`.
- **`reauthRequired()`** — Builds the exact 401 payload (with `REAUTH_REQUIRED` error code, `maxAge`, optional `methods`) that `requireFreshAuth` produces in production.
- **`describe('the REAUTH_REQUIRED step-up flow')`** — Covers: park → prompt → replay; propagation of `methods` into `requiredMethods`; deduplication of two concurrent 401s into one prompt (4 total requests, not 5); rejection on cancel (no replay); single-retry guard (`_steppedUp` flag prevents a second prompt).
- **`describe('the step-up flow in cookie mode')`** — Verifies that in cookie mode the interceptor catches `REAUTH_REQUIRED` *before* the generic "end session" 401 handler, preserves `hasSession`, and sends no `Authorization` header on either attempt.

## Relationships

No graph neighbors are recorded for this file. It imports `useReauthPromptStore` from `@/infrastructure/http/reauth-prompt.ts` and `useSessionStore` from `@/infrastructure/session.ts`, and dynamically imports `@/infrastructure/http` (the interceptor under test).

## Notes

- The file intentionally does **not** mount `app/components/ReauthDialog.vue`; it tests the interceptor's park/replay contract in isolation.
- `loadHttp()` uses `vi.resetModules()` + dynamic import per test to avoid cross-test interceptor state leakage.
- The "two concurrent 401s" test asserts exactly **4** total requests (2 original + 2 replayed), not 5, to catch a regression where a second prompt would trigger an extra replay.
- `server.listen({ onUnhandledRequest: 'error' })` ensures any accidental request to an unstubbed route fails loudly rather than leaking to the network.
