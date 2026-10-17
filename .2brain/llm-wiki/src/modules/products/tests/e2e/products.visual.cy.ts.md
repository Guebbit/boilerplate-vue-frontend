---
source: src/modules/products/tests/e2e/products.visual.cy.ts
sha256: 1ebed70bac2fc41194aad749f8d9ca495f6ed84e7f3f721245ac7891c4886d06
generated_at: 2026-10-17T01:29:29.776456+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/e2e/products.visual.cy.ts

## Purpose

Declares the set of screens the products module contributes to the project-wide visual-regression sweep. It is a one-line registration (plus a comment) that feeds the `sweepVisual` runner defined in the shared support module.

## Key elements

- **`sweepVisual('products', …)` call** – Registers a single screen entry:
  - `id`: `products-list`
  - `url`: `/en/products`
  - `selector`: `#products-list-page` (the element whose pixels are compared)
- **Module doc-block** – Documents the run/update commands and the "look at the diff before re-recording" rule.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** – Provides the `sweepVisual` function actually invoked here. All screen-list files across modules depend on this shared runner; this file is one of its callers. No other symbols are imported or exported.

## Notes

- Excluded from `npm run complete`; it runs only under the dedicated `test:e2e:visual` script.
- Re-recording baselines (`test:e2e:visual:update`) is intentionally gated on a human visually inspecting the diff image first—do not run the update command blindly.
- The relative import path (`../../../../../tests/…`) reflects the file's depth in the module tree; if this file is ever moved, the path must be updated.
