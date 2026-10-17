---
source: scripts/e2e/webhook-sink.ts
sha256: 31d1a2e15e56a63248e4de5a96bd67f4f4e2d8bac14952fc661c65a711792037
generated_at: 2026-10-17T00:01:44.556692+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/webhook-sink.ts

## Purpose

A TLS webhook receiver hosted by the Cypress node process for the demo profile. The demo backend has no message broker, so an admin "replay" is the only way a webhook is delivered; this sink listens on the URL the seeded subscription points to, lets a spec read what arrived, and verifies the Standard Webhooks signature. It exists because the demo profile runs without Docker and therefore cannot use the live-profile `webhook-tester` container.

## Key elements

- **`SINGLE_PROCESS_SINK_PORT`** (3200) — port for single-process serial demo runs.
- **`SHARD_SINK_PORT_BASE`** (3201) — base port for sharded runs; shard *N* uses `3201 + N`.
- **`sinkUrlForPort(port)`** — returns `https://127.0.0.1:<port>`; the literal IP (not `localhost`) is required by the backend's SSRF guard.
- **`DEMO_WEBHOOK_SECRET`** — re-exported from `./webhook-demo-secret` so specs can sign/verify locally.
- **`SinkRequest`** (interface) — one received delivery: `path`, lower-cased `headers`, raw `body`, and a `signatureValid` boolean.
- **`WebhookSink`** (interface) — handle to a running sink: `port`, `requests()`, `clear()`, `close()`.
- **`verifiesStandardWebhook(headers, body, secret)`** — computes HMAC-SHA256 over `<id>.<timestamp>.<body>` with the base64 key from the `whsec_` secret and checks space-separated `v1,<b64>` entries; no timestamp-window check (replays are intentional in demo).
- **`flattenHeaders(headers)`** — normalises Node's array-valued repeated headers into plain strings.
- **`startWebhookSink(port)`** — creates a loopback-bound HTTPS server (cert/key from `webhook-tls.ts`), collects requests, returns 200 by default or 503 when the path contains `dead` (to simulate a failed delivery for retry-journey tests).

## Relationships

- **`cypress.config.ts`** — registers the `cy.task` handler that invokes this module's exports from spec code.
- **`scripts/demo/run-backend.ts`** — launches the demo backend; its SSRF guard whitelists the sink's `127.0.0.1` host in development.
- **`scripts/e2e/run-shards.ts`** — assigns per-shard sink ports using `SHARD_SINK_PORT_BASE`.
- **`scripts/e2e/webhook-demo-secret.ts`** — defines `DEMO_WEBHOOK_SECRET`; this file re-exports it.
- **`scripts/e2e/webhook-tls.ts`** — provides `WEBHOOK_SINK_TLS` (test leaf cert + key) that this sink serves and that the demo backend's dev preload trusts.
- **`scripts/e2e/webhook-tester.ts`** — the Docker-based equivalent used by the live profile; this file is the no-Docker alternative for demo.
- **`tests/support/e2e/harness.ts`** — the e2e harness that calls `startWebhookSink` and exposes the sink to specs.
- **`tests/unit/scripts/e2e/webhook-sink.spec.ts`** — unit tests that import this module directly (possible because it has no Cypress dependency).

## Notes

- **`127.0.0.1`, never `localhost`:** the backend's SSRF guard performs a DNS lookup that bypasses `/etc/hosts`, so only the literal IP will pass.
- **No replay-window check:** `verifiesStandardWebhook` deliberately omits a timestamp-window, because admin replays of old deliveries are a first-class demo action.
- **`dead` path → 503:** any request whose path contains the substring `dead` receives a 503 so the backend records a failed delivery; this drives retry-journey specs.
- **`timingSafeEqual` guard:** the function throws on unequal-length buffers, so the code checks `provided.length === expected.length` before calling it.
- **Loopback-only binding:** the server listens on `127.0.0.1`; nothing external can reach it.
- **Port 0 is supported:** passing 0 lets the OS pick a free port; the resolved port is read from `server.address()` after listen.
