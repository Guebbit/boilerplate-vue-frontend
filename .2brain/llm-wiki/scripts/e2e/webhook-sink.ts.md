---
source: scripts/e2e/webhook-sink.ts
sha256: fbd2588e5a2d58199247e1775ed1f8f5fd230d96d3d5521f70b8dad76f777c58
generated_at: 2026-10-02T14:35:01.530962+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/webhook-sink.ts

## Purpose

A minimal loopback HTTP server that acts as a webhook receiver for the demo profile. The demo backend has no message broker, so nothing delivers webhooks autonomously; instead an admin REPLAYs a delivery, which POSTs synchronously to the seeded subscription URL. This sink listens on a known port, records each request (path, headers, body, signature validity), and lets a Cypress spec assert on what arrived and whether its Standard Webhooks signature verifies.

## Key elements

- **`SINGLE_PROCESS_SINK_PORT` (3200)** — fixed port for serial/`npm run test:e2e:serial` runs.
- **`SHARD_SINK_PORT_BASE` (3201)** — base port for sharded runs; shard *N* listens on `3201 + N`.
- **`sinkUrlForPort(port)`** — returns `http://127.0.0.1:<port>`; deliberately uses the literal IP, not `localhost`.
- **`DEMO_WEBHOOK_SECRET`** — re-exported from `./webhook-demo-secret`; used for signature verification.
- **`SinkRequest`** (interface) — shape of one received request: `path`, `headers` (flattened strings), `body`, `signatureValid`.
- **`WebhookSink`** (interface) — handle to a running sink: `port`, `requests()`, `clear()`, `close()`.
- **`verifiesStandardWebhooks(headers, body, secret)`** — HMAC-SHA256 verification over `<webhook-id>.<webhook-timestamp>.<body>`; accepts multiple space-separated `v1,…` entries (secret rotation); no timestamp-window check.
- **`startWebhookSink(port)`** — binds a `node:http` server to `127.0.0.1:<port>`, records requests into a closure array, responds `200 {}` to every request, and resolves a `WebhookSink`.

## Relationships

- **`cypress.config.ts`** — registers the `cy.task` that calls `startWebhookSink`, bridging Cypress to this module.
- **`scripts/demo/run-backend.ts`** — the demo backend whose admin REPLAY POSTs to the URL this sink hosts.
- **`scripts/e2e/run-shards.ts`** — computes per-shard sink ports from `SHARD_SINK_PORT_BASE` and starts one sink per shard.
- **`scripts/e2e/webhook-demo-secret.ts`** — defines `DEMO_WEBHOOK_SECRET`; this file re-exports it and passes it to `verifiesStandardWebhook`.
- **`scripts/e2e/webhook-tester.ts`** — the live-profile webhook receiver; this file is the demo-profile replacement (no Docker).
- **`tests/support/e2e/harness.ts`** — sets up the sink as part of the e2e harness; the file lives outside `tests/support/e2e/` so the unit suite can import it directly.
- **`tests/unit/scripts/e2e/webhook-sink.spec.ts`** — unit tests for `verifiesStandardWebhook` and related exports.

## Notes

- `sinkUrlForPort` uses `127.0.0.1` rather than `localhost` because the backend's SSRF guard performs a DNS lookup that bypasses `/etc/hosts`.
- No timestamp-window is enforced in signature verification — a replay of an old delivery is the intended use case (admin REPLAY).
- The server answers `200` to every request; the backend treats any non-2xx as a failed delivery.
- `timingSafeEqual` throws on unequal-length inputs, so the code checks length equality first.
- `clear()` reassigns the closure variable (`received = []`) rather than splicing, so in-flight handlers that captured the old array are unaffected.
- The file is intentionally outside `tests/support/e2e/` so `tests/unit/scripts/e2e/webhook-sink.spec.ts` can import it without pulling in the Cypress runtime.
