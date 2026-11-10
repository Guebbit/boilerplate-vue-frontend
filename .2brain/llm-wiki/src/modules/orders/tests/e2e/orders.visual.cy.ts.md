---
source: src/modules/orders/tests/e2e/orders.visual.cy.ts
sha256: 9a0481d3eaff4777aca62f58e7fba7a4041b6ae40f98e2958194663d3586758e
signature: 9a0481d3eaff4777aca62f58e7fba7a4041b6ae40f98e2958194663d3586758e
generated_at: 2026-11-10T05:01:56.604269+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/e2e/orders.visual.cy.ts

## Purpose

Declares the set of orders-module routes that are snapshotted in the project's visual-regression suite. It is a thin, data-only consumer of the shared `sweepVisual` helper—no custom test logic lives here.

## Key elements

- **`sweepVisual` call** – Invokes the shared helper with the module name `'orders'`, an array of two route specs, and the `'user'` role.
- **Route spec: `orders-list`** – Captures `/en/orders` at `#orders-list-page` on `desktop`, `phone`, and `tablet` viewports. Three `redact` selectors mask columns whose values are non-deterministic (order ID, relative dates).
- **Route spec: `order, awaiting transfer`** – Captures the post-checkout detail page (route resolved dynamically via `cy.subjectId('order.awaitingTransfer')`) at `#order-target`, phone viewport only. Two `redact` selectors hide the per-run order id shown in the hero.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** – Provides the `sweepVisual` helper that this file imports and calls. That helper handles viewport iteration, waiting on `readySelector`, applying `redact` masks, and writing/reading the baseline images. This file contributes only the route metadata.

## Notes

- Excluded from `npm run complete`; execute via `npm run test:e2e:visual`.
- Re-record baselines with `npm run test:e2e:visual:update` **only after visually inspecting the diff image** (per the module doc-comment).
- The `redact` arrays exist because the demo data is regenerated at boot (fresh IDs, dates relative to "today"), so raw pixels would never be stable.
- The second route's `route` is a **function** (not a string), returning a Promise—`sweepVisual` must await it before navigating.
