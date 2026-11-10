---
source: scripts/lighthouse/analytics-sink.ts
sha256: 2294fd01777085fdc75b064840d637dc6f48473d93d4af34477e93075c06cc51
signature: 9605c10a6b4424949cc6a934fb12e7cd3f8b54ca81a69b0ffc6e0378a3c4b613
generated_at: 2026-11-10T02:41:38.280238+00:00
model: ollama:qwen3.8:27b
---

# scripts/lighthouse/analytics-sink.ts

## Purpose

A loopback-only HTTP stand-in for Faro's collector endpoint and Umami's script host, used during Lighthouse audits. By pointing `VITE_FARO_URL` and `VITE_UMAMI_SRC` at this server, the audited page exercises its real consent-banner and Faro-boot code paths while guaranteeing no telemetry leaves the machine.

## Key elements

- **`ANALYTICS_SINK_PORT`** (3190) – Default port, chosen to avoid the demo backend (:3100), sharded pool (:3101+), webhook sink (:3200+), app (:8085), Faro Alloy (:12347), and Umami (:3080).
- **`sinkCollectUrl(port)`** – Returns the `http://127.0.0.1:<port>/collect` URL for `VITE_FARO_URL`.
- **`sinkScriptUrl(port)`** – Returns the `http://127.0.0.1:<port>/script.js` URL for `VITE_UMAMI_SRC`.
- **`startAnalyticsSink(port?)`** – Creates a `node:http` server on `127.0.0.1`. Responds:
  - All requests: CORS headers (`access-control-allow-origin: *`, methods `POST/GET/OPTIONS`, echoes requested headers).
  - `GET /script.js`: `200` with empty body and `text/javascript` content type.
  - Everything else: drains the request body, then `204`.
  - Returns the running `Server`; rejects the promise with the listen error (e.g. `EADDRINUSE`).

## Relationships

- **`scripts/lighthouse/build.ts`** – Calls `sinkCollectUrl` / `sinkScriptUrl` to inject the sink URLs into the audit build's environment variables before the app is compiled.
- **`scripts/lighthouse/run.ts`** – Calls `startAnalyticsSink` to bring the sink up (and presumably closes it) around the Lighthouse run.
- **`scripts/lighthouse/audit-environment.ts`** – Provides the audit-scope environment context in which the sink's port and URLs are consumed.
- **`tests/unit/scripts/lighthouse/analytics-sink.spec.ts`** – Unit-tests the exported helpers and server behavior (CORS, 204, empty script, port binding).

## Notes

- The server binds to `127.0.0.1` explicitly; it is never reachable from another host.
- CORS preflight handling is required because Faro posts JSON cross-origin (different port), which triggers a browser `OPTIONS` preflight.
- The body is drained with `request.resume()` before responding; do not remove this or the socket may be left half-open.
- The port is intentionally between the webhook sink range (:3200+) and the app (:8085); changing it requires checking the collision list in the doc comment.
