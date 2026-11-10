---
source: scripts/e2e/webhook-tester.ts
sha256: 9e2d9af769a2bf0ebc814f239f8ecb5d0af3d4ac30b2749e07201be37ea33598
signature: 9348012d21c4e4a6d56f697e78527ad499ec78f53fb8f1acd1a592f2f22e5506
generated_at: 2026-11-10T02:39:28.386890+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/webhook-tester.ts

## Purpose
Reads captured webhook deliveries from a `tarampampam/webhook-tester` container (the live profile's receiver) and normalizes them into the same `ReceivedWebhook` shape the local sink (`webhook-sink.ts`) produces. This lets a journey test read captured requests identically whether the subscription points at the demo sink or the live tester.

## Key elements
- **`ReceivedWebhook`** (exported type) — `Omit<SinkRequest, 'signatureValid'>`; the common shape both receivers yield.
- **`readWebhookTester(subscriptionUrl)`** (exported) — Fetches the tester's `GET /api/session/<id>/requests` over TLS and returns an array of `ReceivedWebhook`, oldest-first. A 404 (session not yet auto-created) resolves to `[]`; any other non-200 status throws.
- **`getFromTester(url)`** (internal) — Wraps `node:https.get` with the demo test CA (`WEBHOOK_SINK_TLS.ca`) as the sole trusted root; returns `{ status, body }`.
- **`sessionRequestsUrl(subscriptionUrl)`** (internal) — Parses the subscription URL to derive the tester's API endpoint and the request path the sink shape reports.
- **`TesterRequest`** (internal interface) — The subset of the tester's API response fields this file consumes.

## Relationships
- **`scripts/e2e/webhook-sink.ts`** — Imports the `SinkRequest` type; `ReceivedWebhook` is defined as a structural subset of it so both receivers are interchangeable.
- **`scripts/e2e/webhook-tls.ts`** — Imports `WEBHOOK_SINK_TLS` for the `ca` option passed to every `node:https` call.
- **`cypress.config.ts`** — Contains the task wiring that invokes `readWebhookTester` at runtime; this file stays free of any Cypress import so it can be unit-tested in isolation.
- **`tests/support/e2e/harness.ts` / `tests/support/e2e/integrator.ts`** — Downstream consumers of the captured-request data during a journey; this file sits outside `tests/support/e2e/` specifically so it can also be imported by the unit suite.
- **`tests/unit/scripts/e2e/webhook-tester.spec.ts`** — Unit-tests `readWebhookTester` in isolation.

## Notes
- Uses `node:https` rather than `fetch` because Cypress's Node process cannot add a per-call CA to `fetch`; `https.get` accepts a `ca` option directly.
- The tester title-cases header names; this module lower-cases them to match the sink's convention before returning.
- The tester auto-creates a session only when the first webhook arrives (`AUTO_CREATE_SESSIONS`), so a 404 is semantically "nothing captured yet," not an error.
- The subscription URL is expected to be `https://<tester-origin>/<sessionId>`; the session id is the last non-empty path segment.
