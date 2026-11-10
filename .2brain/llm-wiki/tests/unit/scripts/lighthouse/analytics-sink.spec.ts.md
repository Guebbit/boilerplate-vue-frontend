---
source: tests/unit/scripts/lighthouse/analytics-sink.spec.ts
sha256: b7df192869aa14723d45d2ff3f7b3e4eec9f64d0d40052a9b83f90a95986cde8
signature: b7df192869aa14723d45d2ff3f7b3e4eec9f64d0d40052a9b83f90a95986cde8
generated_at: 2026-11-10T08:20:55.190791+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/lighthouse/analytics-sink.spec.ts

## Purpose

Unit tests for the `startAnalyticsSink` loopback HTTP server, verifying that it accepts analytics POSTs with `204`, serves an empty `/script.js` endpoint with `200`, attaches CORS headers to every response (including preflight), and fails with `EADDRINUSE` when the target port is already bound.

## Key elements

- **`describe('startAnalyticsSink')`** – single suite covering the sink's three observable contracts.
- **`beforeEach` MSW passthrough rule** – registers `http.all(/^http:\/\/127\.0\.0\.1:\d+\//, () => passthrough())` so the shared MSW server does not intercept requests destined for the real loopback listener.
- **Test: POST / 204 + /script.js / 200** – starts the sink on port 0, issues a `POST /collect` and a `GET /script.js`, asserts status codes, the bound address is `127.0.0.1`, and the script body is `""`.
- **Test: CORS headers** – issues a `POST /collect` and an `OPTIONS` preflight with `access-control-request-headers`, asserts `access-control-allow-origin: *` on both and that the echoed `access-control-allow-headers` matches the request.
- **Test: port already in use** – binds the sink once, then expects a second `startAnalyticsSink(samePort)` call to reject with `/EADDRINUSE/`.

## Relationships

- **`scripts/lighthouse/analytics-sink.ts`** – module under test; the spec imports `startAnalyticsSink` and exercises its returned server object (`.address()`, `.close()`).
- **`tests/support/unit/msw-server.ts`** – provides the shared MSW `server` instance that the spec imports; without the passthrough rule registered on this server, MSW would intercept all loopback requests and the real sink would never receive traffic.

## Notes

- The MSW passthrough rule is **mandatory**: without it MSW's default intercept would swallow every request to `127.0.0.1`, causing the sink to never receive traffic and tests to hang or fail silently.
- The sink is always started on port `0` (OS-assigned ephemeral port) except in the conflict test; the actual port is read via `sink.address() as AddressInfo`.
- Every test opens the sink in the test body and closes it in a `finally` block to avoid leaking listeners.
