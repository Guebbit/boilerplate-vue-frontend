---
source: src/modules/products/tests/e2e/products.visual.cy.ts
sha256: 6f86ac4c7c9eb0d1f034245cee8c163d3c51468a46eadc679d05955910634d11
signature: 6f86ac4c7c9eb0d1f034245cee8c163d3c51468a46eadc679d05955910634d11
generated_at: 2026-11-10T05:23:48.891044+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/e2e/products.visual.cy.ts

## Purpose

Declares which screens, routes, and viewports the **products** module must be captured under in the visual-regression sweep. The file itself performs no test logic; it only supplies the screen list to the shared `sweepVisual` runner.

## Key elements

- **`sweepVisual('products', [...])`** — Single top-level call that registers three screen entries:
  - `products-list` (light theme) at `/en/products` — viewports: desktop, phone, tablet. `readySelector: '#products-list-page'`.
  - `products-list` (dark theme) at `/en/products` — viewport: phone only.
  - `product` (detail page) at a dynamically resolved route (`/en/products/{id}` via `cy.subjectId('product.rich')`) — viewports: desktop, phone. `readySelector: '#product-target'`.
- **Dynamic route** (`route: () => …`) — The detail-page entry resolves the product ID at run time from a seeded fixture rather than hard-coding a literal ID.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — Provides the `sweepVisual` function that this file imports and calls. All capture, viewport, theme, and re-recording mechanics live in that module; this file is purely declarative input to it.

## Notes

- **Not included in `npm run complete`.** Run it with `npm run test:e2e:visual`.
- **Re-recording:** Use `npm run test:e2e:visual:update` only *after* visually inspecting the diff image (per the file's header comment).
- Viewport selection is intentional and commented: the phone view captures the stacked-filter layout, while tablet keeps the wide grid. The dark-theme entry exists only for phone because that is the mobile dark-mode experience that differs structurally.
- The `readySelector` values (`#products-list-page`, `#product-target`) must match IDs present in the rendered page; if a component renames its root ID, the sweep will hang waiting for a selector that never appears.
