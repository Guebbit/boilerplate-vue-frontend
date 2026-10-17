---
source: src/modules/orders/tests/e2e/orders.visual.cy.ts
sha256: 0a75093800d6ceae80e3855b9643a4240024a7b2bad490fbcd422c678a9b8b41
generated_at: 2026-10-17T01:17:15.192810+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/e2e/orders.visual.cy.ts

## Purpose

Declares the visual-regression route list for the orders module. Each entry specifies a route, a readiness selector, and CSS selectors for dynamic cells that must be redacted before snapshot comparison. The file is a thin config consumed by the shared `sweepVisual` runner.

## Key elements

- **`sweepVisual('orders', routes, 'user')`** — single call that registers the module's visual routes. No local functions, classes, or exports; the file is side-effect-only.
- **`orders-list` route config** — targets `/en/orders`, waits on `#orders-list-page`, and redacts columns 1, 5, and 6 of the table body (order IDs and relative dates generated at boot).

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — provides the `sweepVisual` helper that this file imports. That helper is responsible for navigating each route, waiting on `readySelector`, applying `redact` selectors, and capturing the screenshot under the given module name and role (`user`).

## Notes

- **Not part of `npm run complete`.** Run explicitly with `npm run test:e2e:visual`.
- **Re-recording** (`npm run test:e2e:visual:update`) should only happen after visually inspecting the diff image.
- The redact list is necessary because the demo data regenerates IDs and dates on every boot; without it every snapshot would be a false positive.
- The `'user'` third argument to `sweepVisual` implies role-scoped fixtures; see the helper for how that is resolved.
