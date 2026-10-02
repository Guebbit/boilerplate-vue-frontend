---
source: scripts/e2e/webhook-demo-secret.ts
sha256: ca4c16a9f7adadd8033690760fd4a5b96aa92a742e745371bf11994b00e05a15
generated_at: 2026-10-02T14:34:33.094750+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/webhook-demo-secret.ts

## Purpose

Exports a single hardcoded signing secret for the seeded demo subscription so that browser-side Cypress journeys can verify webhook signatures without pulling in Node-only dependencies.

## Key elements

- **`DEMO_WEBHOOK_SECRET`** – A string constant (`whsec_ZGVt...`). It mirrors the backend's `WEBHOOK_DEMO_SECRET` defined in `scenarios/webhooks.ts`. The base64 payload after `whsec_` decodes to `"demo-webhook-secret-do-not-use-in-production"`, confirming it is a public demo fixture, not a real credential.

## Relationships

- **`scripts/e2e/webhook-sink.ts`** – Sibling file in the same directory. The sink imports `node:http` and `node:crypto` to actually receive and parse webhook requests; this file exists separately so that browser-context code (Cypress journeys) can import the secret without transitively loading Node-only modules.
- **`tests/e2e/specs/journeys/in3-an-order-fires-a-signed-webhook.cy.ts`** – The Cypress journey that imports `DEMO_WEBHOOK_SECRET` to recompute and assert the HMAC signature on the webhook payload fired by an order.

## Notes

- This file is intentionally minimal (one export, no imports) so it can be bundled into a browser context by Cypress. Adding any `node:*` import here would break that journey.
- The secret is a fixed public demo value; it must stay in sync with `scenarios/webhooks.ts` or signature verification in the journey will fail silently.
