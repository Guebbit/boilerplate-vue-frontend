---
source: tests/unit/scripts/e2e/payment-webhook.spec.ts
sha256: 7c00cf5ed873b6ba1edc711916e2b6291c01f5d93d606fb915b50110c079af29
signature: 809232bbcb78a49abe6f7192a65561b71de0f29cfde1a2c466c8fc8f28a625af
generated_at: 2026-11-10T08:17:14.714654+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/payment-webhook.spec.ts

## Purpose

Unit tests for the E2E payment-webhook signing and delivery helpers in `scripts/e2e/payment-webhook.ts`. Verifies that the signature format matches the backend's verification scheme (`t=<unix>,v1=<HMAC-SHA256 hex of "<t>.<body>"`) and that the HTTP POST sends the correctly signed body, honours the environment secret, and returns HTTP status codes rather than throwing.

## Key elements

- **`describe('signPaymentWebhook')`** — asserts the exact signature string format and that changing any input (body, timestamp, secret) changes the output.
- **`describe('postPaymentWebhook')`** — three tests:
  - Verifies the POST URL, JSON body, and that the `payment-signature` header equals `signPaymentWebhook(body, ts, DEMO_PAYMENT_WEBHOOK_SECRET)`.
  - Confirms `E2E_PAYMENT_WEBHOOK_SECRET` env var overrides the demo secret.
  - Confirms a non-2xx response (400) resolves to that status number rather than rejecting.
- **`stubFetch(status)`** (local helper) — replaces global `fetch` with a `vi.stubGlobal` mock that records `{url, init}` calls and resolves with the given status.
- **Imports** — `DEMO_PAYMENT_WEBHOOK_SECRET`, `postPaymentWebhook`, `signPaymentWebhook` from `scripts/e2e/payment-webhook.ts`; `createHmac` from `node:crypto` for independent expected-value computation.

## Relationships

- **`scripts/e2e/payment-webhook.ts`** — the module under test. All three named exports (`DEMO_PAYMENT_WEBHOOK_SECRET`, `postPaymentWebhook`, `signPaymentWebhook`) are imported and exercised here. The tests recompute the HMAC with `node:crypto` directly to avoid circular trust.

## Notes

- The file lives under `tests/unit/scripts/e2e/` but tests a *script* (not a library). The path mirrors the source tree for easy navigation.
- `stubFetch` is re-created per test (not a shared module-level stub), so each test gets its own `sent` array; there is no `vi.unstubAllGlobals` cleanup — Vitest's per-test isolation handles it.
- The "signs the exact bytes it sends" test compares the header against a re-computed `signPaymentWebhook` call on the *sent* body string, confirming the implementation signs the serialised body rather than a pre-serialised object.
- The refusal test relies on `postPaymentWebhook` resolving (not rejecting) with a numeric status — a deliberate API contract this test locks in.
