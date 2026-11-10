---
source: scripts/e2e/webhook-sink.ts
sha256: 31d1a2e15e56a63248e4de5a96bd67f4f4e2d8bac14952fc661c65a711792037
signature: ec2ad2334fb91fbd75ccb2789df76da63a66daaf12633172bc43fcb1ed69c3e9
generated_at: 2026-11-10T02:38:59.541322+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/webhook-sink.ts

## Purpose

A TLS webhook receiver hosted inside the Cypress node process for the **demo** profile. The demo backend has no message broker, so webhooks only arrive when an admin triggers a replay — which POSTs synchronously to the subscription URL. This file provides the HTTPS listener that receives those POSTs, records each delivery (path, headers, body, signature validity) for spec assertions, and verifies Standard Webhooks signatures. It exists because the demo runs without Docker, so a full `webhook-tester` container is unavailable.

## Key elements

- **`SINGLE_PROCESS_SINK_PORT`** (3200) / **`SHARD_SINK_PORT_BASE`** (3201) — port assignments for serial vs. sharded e2e runs.
- **`sinkUrlForPort(port)`** — returns `https://127.0.0.1:<port>` (always literal IP, never `localhost`).
- **`DEMO_WEBHOOK_SECRET`** — re-exported from `./webhook-demo-secret` for convenient access by spec code.
- **`SinkRequest`** — interface describing one captured delivery: `path`, `headers` (lower-cased), `body`, `signatureValid`.
- **`WebhookSink`** — interface for a running sink: `port`, `requests()`, `clear()`, `close()`.
- **`verifiesStandardWebhook(headers, body, secret)`** — validates a Standard Webhooks signature (HMAC-SHA256 over `<id>.<timestamp>.<body>`, `whsec_` secret, `v1,<base64>` entries, no timestamp window).
- **`startWebhookSink(port)`** — binds an HTTPS server to loopback, records deliveries, and returns a `WebhookSink`. Returns 503 for any path containing `"dead"` (simulates a dead receiver); 200 otherwise.
- **`flattenHeaders`** (internal) — converts Node's `IncomingHttpHeaders` (possible arrays) to plain `Record<string, string>`.

## Relationships

- **`scripts/e2e/webhook-demo-secret.ts`** — source of `DEMO_WEBHOOK_SECRET`, re-exported here for spec convenience.
- **`scripts/e2e/webhook-tls.ts`** — provides `WEBHOOK_SINK_TLS` (cert + key) used to make the sink speak TLS.
- **`scripts/e2e/webhook-tester.ts`** — the Docker-based webhook receiver used by the live profile; this file replaces it in the demo profile, which runs without Docker.
- **`cypress.config.ts`** — hosts the integration wiring that calls `startWebhookSink`; this file deliberately contains no Cypress imports so the unit suite can pin it.
- **`scripts/e2e/run-shards.ts`** — uses `SHARD_SINK_PORT_BASE` to compute each shard's sink port (base + N, beside its backend on 3101+N).
- **`scripts/demo/run-backend.ts`** — the demo backend whose `NODE_WEBHOOK_DEMO_SINK_URL` targets this sink and whose SSRF guard exempts the sink's host in development.
- **`tests/unit/scripts/e2e/webhook-sink.spec.ts`** — unit tests exercising `verifiesStandardWebhook` and `startWebhookSink` without a Cypress runtime.
- **`tests/support/e2e/harness.ts`** — this file is deliberately placed outside `tests/support/e2e/` so importing it does not pull in the Cypress harness.

## Notes

- **`127.0.0.1`, never `localhost`:** the backend's SSRF guard performs a DNS lookup that bypasses `/etc/hosts`; using `localhost` would trip the private-address check.
- **No timestamp window on signatures:** the Standard Webhooks spec suggests a 60 s window, but the demo deliberately omits it because an admin replaying an old delivery is the primary use case.
- **Path `"dead"` → 503:** not a routing rule per se; any path *containing* the substring `dead` triggers the failure path, letting specs exercise the backend's "failed delivery → retry" journey.
- **Loopback-only bind:** `server.listen(port, '127.0.0.1', …)` prevents any non-local process from reaching the sink.
- **Port-0 support:** passing `0` lets the OS allocate a free port; the resolved port is returned in `WebhookSink.port`.
- **`timingSafeEqual` guard:** a short `v1,…` entry would throw; the code checks `provided.length === expected.length` first to avoid that.
- **Pure of Cypress:** no `cy.*` imports, so the unit suite can import and assert against the module directly.
