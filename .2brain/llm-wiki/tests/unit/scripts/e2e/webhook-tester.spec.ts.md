---
source: tests/unit/scripts/e2e/webhook-tester.spec.ts
sha256: a9d6d3ac9424fba19680375aaf0717b514c77f44df295a78fae73c4aa9f9e144
generated_at: 2026-10-17T02:44:17.229857+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/webhook-tester.spec.ts

## Purpose

Unit tests for `readWebhookTester`, verifying that it speaks HTTPS to a tester sink, parses the captured-request list into the sink's shape, sorts by `captured_at_unix_milli`, lower-cases header names, and handles non-200/404 responses.

## Key elements

- **`fakeTester(status, body)`** — Spins up a `node:https` server (ephemeral port on `127.0.0.1`) that returns a fixed status and JSON body to every request; echoes the requested path back in an `X-Asked` header. Returns the `https://` origin string.
- **`server`** (module-level) — Holds the active fake server so `afterEach` can close it; reset to `undefined` after each case.
- **`describe('readWebhookTester')`** — Three cases:
  1. *Session selection + ordering + header casing* — feeds two captured requests (timestamps 2000, 1000); asserts the result is sorted oldest-first and that `Webhook-Id` arrives as `webhook-id`. Also asserts the parsed `path` and decoded `body`.
  2. *404 → empty array* — a session the tester hasn't created yet yields `[]`.
  3. *Non-200/404 → throws* — a 500 response causes a rejection whose message includes the full API URL (`/api/session/broken/requests`).

## Relationships

- **`scripts/e2e/webhook-tester.ts`** — source of `readWebhookTester`, the function under test. This spec exercises its happy path, 404 path, and error path.
- **`scripts/e2e/webhook-tls.ts`** — source of `WEBHOOK_SINK_TLS` (cert + key pair for the committed test leaf). The fake server is created with these credentials so the reader's TLS verification (trusting only the test CA) is exercised for real.

## Notes

- Despite living under `tests/unit/`, this is an integration-style test: it stands up a real TLS listener and makes a real HTTPS request rather than mocking `fetch`.
- The reader is called with a *session-scoped* URL (e.g. `/session-1`), but internally it constructs the API path (`/api/session/<name>/requests`), which is what appears in error messages.
- The `X-Asked` response header is emitted by the fake server but never asserted on in the current tests; it exists to let a test pin the exact API address if needed later.
