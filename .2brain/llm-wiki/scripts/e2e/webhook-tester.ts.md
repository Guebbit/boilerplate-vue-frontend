---
source: scripts/e2e/webhook-tester.ts
sha256: 9e2d9af769a2bf0ebc814f239f8ecb5d0af3d4ac30b2749e07201be37ea33598
generated_at: 2026-10-17T00:01:57.363735+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/webhook-tester.ts

## Purpose

Reads captured webhooks from a running `tarampampam/webhook-tester` container (behind a TLS proxy) via its HTTP API, and normalises the response into the same `SinkRequest`-compatible shape the local demo sink produces. This lets an e2e journey read received webhooks identically whether the receiver is the in-process sink or the live tester.

## Key elements

- **`ReceivedWebhook`** (exported type) — A `SinkRequest` minus the `signatureValid` field; the common shape both receivers yield.
- **`readWebhookTester(subscriptionUrl)`** (exported) — Fetches the session's captured requests from the tester API, returns them oldest-first as `ReceivedWebhook[]`. A 404 (session not yet created) resolves to `[]`; any other non-200 status rejects.
- **`getFromTester(url)`** (private) — HTTPS GET that trusts only the demo test CA (`WEBHOOK_SINK_TLS.ca`). Uses `node:https` rather than `fetch` because the latter cannot accept a per-call CA.
- **`sessionRequestsUrl(subscriptionUrl)`** (private) — Parses the subscription URL to derive the tester's `/api/session/<id>/requests` endpoint and the original request path.
- **`TesterRequest`** (private interface) — Matches the tester API's JSON response fields (`request_payload_base64`, title-cased headers, `captured_at_unix_milli`).

## Relationships

- **`scripts/e2e/webhook-sink.ts`** — Imports the `SinkRequest` type; this module maps tester responses into that same shape.
- **`scripts/e2e/webhook-tls.ts`** — Imports `WEBHOOK_SINK_TLS` for the CA bundle passed to every HTTPS request.
- **`cypress.config.ts`** — Registers the `cy.task` that delegates to `readWebhookTester` (wiring lives there, not here).
- **`tests/support/e2e/harness.ts` / `integrator.ts`** — Consumers that read captured webhooks through this module (or the sink) during journeys.
- **`tests/unit/scripts/e2e/webhook-tester.spec.ts`** — Unit test that pins `readWebhookTester`'s contract; possible because this file sits outside `tests/support/e2e/` and is Cypress-free.

## Notes

- Header names are **lower-cased** to match the sink's convention (the tester title-cases them).
- Results are explicitly sorted by `captured_at_unix_milli` ascending, regardless of the order the tester returns them.
- A **404 is not an error**: the tester auto-creates a session only on the first inbound webhook (`AUTO_CREATE_SESSIONS`), so "no session yet" is the normal pre-webhook state.
- The file deliberately uses `node:https` instead of `fetch`/`undici` because Cypress's bundled Node runtime has no mechanism to inject a per-request CA bundle.
