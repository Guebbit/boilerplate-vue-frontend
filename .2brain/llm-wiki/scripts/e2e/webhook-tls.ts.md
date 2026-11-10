---
source: scripts/e2e/webhook-tls.ts
sha256: ff930c552bc473208c0ae89273ce5f573702e61ef05262cedcf4914bf82e8f3b
signature: 0153ca4d6ec2975a179d2b2cc0f13f91977dee5e4f8702f37919720045e21be7
generated_at: 2026-11-10T02:39:43.251562+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/webhook-tls.ts

## Purpose

Provides the TLS material (test CA + leaf certificate + key) for the demo webhook sink so that `https://` URLs on `127.0.0.1` are accepted by the backend. It exists as a standalone module so that both the sink (which serves the leaf) and the tester (which connects to it) read the same three PEM files from one place.

## Key elements

- **`TLS_DIRECTORY`** (internal const) — resolves to `<this file's dir>/tls`, the directory holding the synced PEM files.
- **`readPem`** (internal helper) — reads a single PEM file from `TLS_DIRECTORY` into a `Buffer`.
- **`WEBHOOK_SINK_TLS`** (export, `as const`) — object with three `Buffer` fields (`ca`, `cert`, `key`) matching the shape `node:https` options expect. Loaded eagerly at module-import time.

## Relationships

- **`scripts/e2e/webhook-sink.ts`** — the code that *serves*: imports `WEBHOOK_SINK_TLS` to configure its HTTPS server with the leaf cert and key.
- **`scripts/e2e/webhook-tester.ts`** — the code that *reads*: imports `WEBHOOK_SINK_TLS` to supply the CA (and, via a proxy, the same leaf) when reaching the sink URL.
- **`tests/unit/scripts/e2e/webhook-sink.spec.ts`** — exercises the sink that consumes this file's export.
- **`tests/unit/scripts/e2e/webhook-tester.spec.ts`** — exercises the tester that consumes this file's export.

## Notes

- The three PEM files in `tls/` are **copies owned by the backend**. The backend regenerates them (`npm run scenario:tls`) and syncs them via `sync:frontend`. Do **not** edit them in this repo.
- The leaf private key is intentionally committed and is only valid for `127.0.0.1`.
- A "spec-identity check" in the backend compares these copies to its originals; a mismatch there means the sync step was skipped.
