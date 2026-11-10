---
source: src/modules/delivery/tests/e2e/actions.cy.ts
sha256: 3321883faf51de60d5cb481a048695d7f6f86347ff73a76e721b78d22ad0e40b
signature: ed72efcd876c9699555fe4c2f3fbd2831f49d41261b8cdf86fec30814312c9cd
generated_at: 2026-11-10T04:18:47.322544+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/tests/e2e/actions.cy.ts

## Purpose

End-to-end test that verifies the fulfillment screen's failure-recovery behavior: when a ship or hold action is answered with a server fault, the dialog stays open with the user's input intact, an error alert is shown, and a retry succeeds. Delegates all orchestration to the shared `actionTable` runner.

## Key elements

- **`paidOrderPage`** — helper that resolves a seeded `order.paidExpress` subject ID into the `/en/orders/:id` URL for a paid order with one shipping group.
- **`actionTable('delivery', [ … ])`** — registration of two test rows:
  - *Failed shipment*: types a tracking code, submits, intercepts the `POST …/shipments` call to force a fault, asserts the `ship-items-error` alert and that the dialog (`ship-submit`) with the typed code is still visible, then retries successfully.
  - *Failed hold*: selects a hold reason ("High risk"), submits, intercepts the `POST …/hold` call to force a fault, asserts the `hold-error` alert and that the `hold-dialog` with the selected reason is still visible, then retries successfully.

## Relationships

- **`tests/support/e2e/action-table.ts`** — provides the `actionTable` runner imported at the top of this file. It interprets each row's `prepare` / `trigger` / `intercept` / `kind` / `alert` / `dialog` / `control` fields to drive the generic "action fails → UI recovers → retry succeeds" flow. This file is purely declarative configuration for that runner.

## Notes

- Element selection relies entirely on `data-test` attributes and ARIA roles; there are no CSS-class selectors.
- `cy.subjectId('order.paidExpress')` is the project's convention for resolving a named seeded entity to its ID at test time rather than hard-coding a URL.
- `intercept.url` uses a glob (`**/…/*/…`) while `intercept.operation` carries the exact OpenAPI-style path — the runner presumably matches on one or both.
- Both rows pin `persona: 'warehouse'`, so the tests assume that role is active (granted by the harness, not set here).
