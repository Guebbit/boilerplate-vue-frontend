---
source: tests/unit/scripts/e2e/webhook-sink.spec.ts
sha256: f0a1da4bd897b33db244528f6c5bed5e6f8a5961973c712603cec4568905359a
signature: 3c62f80742a5c3a784c46cfad123ccdb29172096dea9f74bf32daa1896cacd80
generated_at: 2026-11-10T08:19:22.159709+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/webhook-sink.spec.ts

## Purpose

Vitest unit tests for the E2E webhook sink script. Exercises the Standard Webhooks signature verifier, the port-allocation invariants, and the live HTTPS sink server (record, clear, path-based 503, port-conflict refusal) without relying on any external service.

## Key elements

- **`sign`** (local helper) — Replicates the backend's HMAC-SHA256 signing under `DEMO_WEBHOOK_SECRET`; used to craft valid and invalid `webhook-signature` headers.
- **`describe('verifiesStandardWebhook')`** — Table-driven tests covering: valid single-signature acceptance, multi-entry (key-rotation) acceptance, rejection on mismatched body/id/timestamp, and rejection of missing header, wrong scheme, or truncated signature.
- **`describe('the ports')`** — Asserts `SINGLE_PROCESS_SINK_PORT < SHARD_SINK_PORT_BASE` and that `sinkUrlForPort` always emits a `127.0.0.1` literal (never a hostname).
- **`deliver`** (local helper) — `POST`s a body to the sink with the three Standard Webhooks headers, using `WEBHOOK_SINK_TLS.ca` as the *only* trusted CA; resolves with the response status code.
- **`describe('startWebhookSink')`** — Spins up a real sink on an ephemeral port (port 0), then verifies: request recording with per-request `signatureValid` verdict, `sink.clear()` resetting state, 503 on paths containing `dead`, 200 elsewhere, and rejection when binding a port already in use. Cleans up via `afterEach`.

## Relationships

- **`scripts/e2e/webhook-sink.ts`** — The module under test. All core symbols (`verifiesStandardWebhook`, `startWebhookSink`, `sinkUrlForPort`, `DEMO_WEBHOOK_SECRET`, port constants, `WebhookSink` type) are imported from this file.
- **`scripts/e2e/webhook-tls.ts`** — Source of the `WEBHOOK_SINK_TLS` import; its `ca` field is passed as the `ca` option to every `node:https` request in the `deliver` helper, so the TLS handshake validates only against the demo certificate.

## Notes

- Tests open real TCP listeners (ephemeral port 0). The `afterEach` hook closes the sink; a crash or unhandled rejection in one test can leave a port bound and cascade into the next test.
- `deliver` replaces the system trust store with the single demo CA. If `WEBHOOK_SINK_TLS.ca` is empty or misconfigured, the TLS handshake fails with an *error* (not a bad status), surfacing as a rejected promise.
- The 503-on-`dead`-path behavior is a sink-internal convention, not an HTTP standard; the test encodes the exact substring match (`in4-dead` vs `in4-alive`).
