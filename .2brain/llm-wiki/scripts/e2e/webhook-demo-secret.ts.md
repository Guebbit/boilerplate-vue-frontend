---
source: scripts/e2e/webhook-demo-secret.ts
sha256: ca4c16a9f7adadd8033690760fd4a5b96aa92a742e745371bf11994b00e05a15
signature: ca4c16a9f7adadd8033690760fd4a5b96aa92a742e745371bf11994b00e05a15
generated_at: 2026-11-10T02:38:24.107240+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/webhook-demo-secret.ts

## Purpose

A single-constant file that exposes the fixed demo webhook signing secret (`DEMO_WEBHOOK_SECRET`) to browser-side journey tests. It exists as a separate module so that a Cypress journey can import the secret without pulling in Node-only dependencies that live in the neighboring `webhook-sink.ts`.

## Key elements

- **`DEMO_WEBHOOK_SECRET`** (exported `const`) — The `whsec_`-prefixed signing key for the seeded demo subscription. Its base64 payload decodes to the human-readable string `demo-webhook-secret-do-not-use-in-production`. Mirrors the backend value defined as `WEBHOOK_DEMO_SECRET` in `scenarios/webhooks.ts`.

## Relationships

- **`scripts/e2e/webhook-sink.ts`** — Sits in the same directory and provides the Node-side HTTP sink + signature-verification logic (imports `node:http`, `node:crypto`). The secret file is deliberately kept separate so that browser contexts can import the constant without triggering those Node imports.
- **`tests/e2e/specs/journeys/in3-an-order-fires-a-signed-webhook.cy.ts`** — The journey that imports `DEMO_WEBHOOK_SECRET` to verify a signed webhook signature in the browser. Because this file runs client-side, it cannot import `webhook-sink.ts` directly and therefore depends on this standalone constant.

## Notes

- The secret is intentionally a fixed, public demo value. Do not treat it as a real credential or copy it into production configuration.
- If you need to change the demo secret, update **both** this file and `scenarios/webhooks.ts` (`WEBHOOK_DEMO_SECRET`) to keep the backend and the test journey in sync.
- The file contains no logic — only the one `export const`. Any added import of a Node module will break browser-side journeys that consume it.
