---
source: tests/unit/scripts/e2e/payment-webhook.spec.ts
sha256: 070bcaf8e3f53a09eec8cb027c483c85d0e1870fd3211721555901ef13b693b1
generated_at: 2026-10-17T02:43:18.346929+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/payment-webhook.spec.ts

## Purpose
Unit tests for the `scripts/e2e/payment-webhook.ts` module, verifying that webhook payloads are signed with the correct `t=<unix seconds>,v1=<hex HMAC-SHA256>` scheme and delivered via `fetch` with the expected headers, URL, and body.

## Key elements

- **`describe('signPaymentWebhook')`** — asserts the output format (`t=…,v1=…`) and that the hex digest changes when body, timestamp, or secret changes. The expected digest is computed independently via `node:crypto`'s `createHmac`.
- **`describe('postPaymentWebhook')`** — covers three behaviors:
  - Signs the *exact serialized body string* (not a re-serialized object) using `DEMO_PAYMENT_WEBHOOK_SECRET` by default.
  - Prefers the `E2E_PAYMENT_WEBHOOK_SECRET` environment variable over the demo secret.
  - Returns the HTTP status code (e.g. `400`) as a resolved value rather than throwing on non-2xx responses.
- **`stubFetch(status)`** (local helper) — replaces global `fetch` with a spy that records `{ url, init }` calls and resolves with a bare `Response(null, { status })`.
- **`afterEach`** — calls `vi.unstubAllGlobals()` and `vi.unstubAllEnvs()` to clean up the fetch stub and any env overrides between tests.

## Relationships

- **`scripts/e2e/payment-webhook.ts`** — the module under test. This spec imports `signPaymentWebhook`, `postPaymentWebhook`, and `DEMO_PAYMENT_WEBHOOK_SECRET` from it and exercises each.
- **`node:crypto`** (`createHmac`) — used *only in the test* to independently compute the expected HMAC, acting as an oracle for the module under test.
- **`vitest`** — provides `describe`/`it`/`expect`, the `vi` test API (`stubGlobal`, `stubEnv`, `unstubAllGlobals`, `unstubAllEnvs`).

## Notes

- The signature input is the **raw body string as sent over the wire**, not a JSON-reparsed object. The "signs the exact bytes it sends" test captures the serialized string and re-feeds it to `signPaymentWebhook` to confirm the module signs the same string it transmits.
- `postPaymentWebhook` treats non-2xx as a *normal return* (the numeric status), not an error — callers must check the returned code rather than wrap in `try/catch`.
- The file lives under `tests/unit/` despite exercising E2E script logic; it does not hit a real server (fetch is always stubbed).
