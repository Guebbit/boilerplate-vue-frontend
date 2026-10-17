---
source: tests/unit/scripts/e2e/webhook-sink.spec.ts
sha256: f0a1da4bd897b33db244528f6c5bed5e6f8a5961973c712603cec4568905359a
generated_at: 2026-10-17T02:44:06.350164+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/webhook-sink.spec.ts

## Purpose
Vitest suite that exercises the webhook sink module end-to-end: it validates the Standard Webhooks signature-checking function in isolation, asserts port-range invariants, and spins up a real HTTPS listener to confirm request recording, path-based 503 simulation, and port-conflict rejection.

## Key elements
- **`sign(id, timestamp, body)`** – local helper that produces a `v1,<base64-hmac>` signature using the same `DEMO_WEBHOOK_SECRET` the backend would use, so tests can craft valid or invalid signatures.
- **`deliver(port, body, signature, path)`** – local helper that POSTs to the sink over HTTPS, replacing the default CA bundle with the demo CA from `WEBHOOK_SINK_TLS.ca`; a completed handshake therefore proves the sink serves the correct leaf. Returns the response status code.
- **`describe('verifiesStandardWebhook')`** – table-driven tests covering: valid single-entry signature, multi-entry (key-rotation) signature, and rejection on wrong body/id/timestamp, missing header, foreign scheme, and truncated signature.
- **`describe('the ports')`** – asserts `SINGLE_PROCESS_SINK_PORT < SHARD_SINK_PORT_BASE` and that `sinkUrlForPort` returns a literal `127.0.0.1` URL.
- **`describe('startWebhookSink')`** – starts the sink on port 0 (OS-assigned), sends signed and forged deliveries, inspects `sink.requests()` and `sink.clear()`, verifies the `/in4-dead` path yields 503 while others yield 200, and confirms a second `startWebhookSink` on an already-bound port rejects.

## Relationships
- **`scripts/e2e/webhook-sink.ts`** – the module under test; this spec imports `verifiesStandardWebhook`, `startWebhookSink`, `sinkUrlForPort`, the port constants, `DEMO_WEBHOOK_SECRET`, and the `WebhookSink` type from it.
- **`scripts/e2e/webhook-tls.ts`** – provides `WEBHOOK_SINK_TLS` (the demo CA and key material); the spec uses `WEBHOOK_SINK_TLS.ca` as the sole trusted root in its `deliver` helper to exercise the sink's TLS path.

## Notes
- The file's header comment is explicit: the sink is a **real listener on a real port**, not a stub. Tests that only verify a stub would not prove the sink works.
- `startWebhookSink(0)` is used throughout so the OS picks a free port, avoiding collisions in CI; the actual port is read back from the returned object.
- The "dead" path convention (`/in4-dead` → 503) is a sink-side feature for simulating an unreachable receiver in higher-level e2e flows; the spec locks in that behavior.
- The `sign` helper strips the `whsec_` prefix and base64-decodes the remainder before using it as the HMAC key—mirroring the production signing algorithm.
- `afterEach` closes the sink; forgetting this would leave a dangling server handle in Vitest.
