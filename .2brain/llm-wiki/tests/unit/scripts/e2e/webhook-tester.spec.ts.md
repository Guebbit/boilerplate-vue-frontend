---
source: tests/unit/scripts/e2e/webhook-tester.spec.ts
sha256: 98da67f33f043397d96a3af6206b9088725a9074124d02b46ae544edbbbac1fd
signature: bf23444f9eaa74fc79b6d98c4b4f584402790b1bb84d0658ecaf42aa4bed320d
generated_at: 2026-11-10T08:19:32.946798+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/webhook-tester.spec.ts

## Purpose
Unit tests for `readWebhookTester` (the sink-side reader that fetches captured requests from the tester over HTTPS). Spins up a real TLS listener on loopback using the committed test leaf so the reader must negotiate HTTPS and trust only the test CA, then asserts ordering, header casing, missing-session, and error-path behavior.

## Key elements
- **`fakeTester(status, body)`** — Creates a one-shot `node:https` server on `127.0.0.1:0` with `WEBHOOK_SINK_TLS` certs. Echoes the requested path back in an `X-Asked` response header and returns the origin URL. Used by every test case to stand up a controllable endpoint.
- **`beforeEach` MSW passthrough rule** — Registers `http.all(/^https:\/\/127\.0\.0\.1:\d+\//, () => passthrough())` on the shared MSW server so the real loopback HTTPS call is not intercepted.
- **`afterEach`** — Closes the fake server and clears the reference.
- **`describe('readWebhookTester')`** — Three cases:
  - 200 with two entries → returns them ordered oldest-first (`captured_at_unix_milli`), with header names lower-cased.
  - 404 → resolves to `[]`.
  - 500 → rejects with a message containing the full API path that was requested.

## Relationships
- **`scripts/e2e/webhook-tester.ts`** — Source of `readWebhookTester`, the function under test.
- **`scripts/e2e/webhook-tls.ts`** — Source of `WEBHOOK_SINK_TLS` (`cert`, `key`) that configure the fake server's TLS context.
- **`tests/support/unit/msw-server.ts`** — Provides the shared `server` (MSW instance) that this spec mutates with a scoped passthrough rule in `beforeEach`.

## Notes
- The MSW passthrough is intentionally scoped to `https://127.0.0.1:\d+/` rather than a blanket `127.0.0.1` exemption; a global exemption would mask accidental loopback calls from other tests (see inline comment).
- The `X-Asked` header the fake server returns is a test convenience that lets assertions pin the exact API path the reader requested (used implicitly by the 500 error-message regex).
- Header name casing is an assertion target: the reader is expected to normalise `Webhook-Id` → `webhook-id` before exposing it.
