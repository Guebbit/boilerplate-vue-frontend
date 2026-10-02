---
source: scripts/e2e/webhook-tester.ts
sha256: a6adcf414d78e38df15877aadee2c0c5c9cca3b8fda91c2a9a7c2660a6bb4618
generated_at: 2026-10-02T14:35:23.139708+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/webhook-tester.ts

## Purpose

Normalizes the capture list returned by a live `tarampampam/webhook-tester` container into the same shape that the demo profile's `webhook-sink.ts` produces, so e2e journeys can assert on received webhooks identically regardless of which profile is under test. Kept free of any Cypress import and placed outside `tests/support/e2e/` so the unit suite can exercise it directly.

## Key elements

- **`ReceivedWebhook`** (type export) — `Omit<SinkRequest, 'signatureValid'>`; the common "one captured request" shape both receivers yield.
- **`TesterRequest`** (local interface) — mirrors the per-item shape of the tester's `GET /api/session/<id>/requests` response.
- **`sessionRequestsUrl`** (local helper) — parses a subscription URL to extract the origin and session ID, returning the tester API endpoint and the path to store on each result.
- **`readWebhookTester`** (function export) — fetches the session's captures, returns `[]` on 404, sorts oldest-first, lower-cases header names, base64-decodes the body, and maps each item to `ReceivedWebhook`.

## Relationships

- **`scripts/e2e/webhook-sink.ts`** — source of the `SinkRequest` type that `ReceivedWebhook` derives from; this file exists to make the tester's output indistinguishable from the sink's.
- **`cypress.config.ts`** — registers the `cy.task` that delegates to `readWebhookTester`, providing the bridge into the Cypress runtime.
- **`tests/support/e2e/harness.ts`** / **`tests/support/e2e/integrator.ts`** — journey steps that trigger webhooks and then read the captured list through the shape this file produces.
- **`tests/unit/scripts/e2e/webhook-tester.spec.ts`** — unit-tests `readWebhookTester` in isolation; the file's location and purity are a prerequisite for that.

## Notes

- **404 ≠ error.** The tester with `AUTO_CREATE_SESSIONS` has no session until the first webhook lands, so a 404 is mapped to an empty array rather than thrown.
- **Header case normalization.** The tester title-cases header names (`Content-Type`); the sink lower-cases them. This file lower-cases to keep the two receivers indistinguishable.
- **Ordering.** The tester may return captures in any order; this file explicitly sorts by `captured_at_unix_milli` ascending to match the sink's oldest-first convention.
- **Body encoding.** The tester stores the payload as a base64 string (`request_payload_base64`); this file decodes it to a UTF-8 string so callers never see raw base64.
