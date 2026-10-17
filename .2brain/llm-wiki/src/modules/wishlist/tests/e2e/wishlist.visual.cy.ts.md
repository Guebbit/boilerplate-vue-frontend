---
source: src/modules/wishlist/tests/e2e/wishlist.visual.cy.ts
sha256: 36b286308f6ee1765ede5f2ee034f7fb52fa3a6143dced07269f836eca26a4ec
generated_at: 2026-10-17T01:54:58.369618+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/tests/e2e/wishlist.visual.cy.ts

## Purpose

Declares the wishlist screen for visual-regression testing. This file is a thin "screen list" that registers one route with the shared sweep utility; it contains no test logic of its own.

## Key elements

- **`sweepVisual('wishlist', [['wishlist', '/en/wishlist', '#wishlist-page']], 'user')`** — Registers the wishlist page for a visual sweep. The tuple provides the test name, the URL path, and the page-load selector (`#wishlist-page`). The third argument (`'user'`) indicates the sweep runs as an authenticated user.
- **Import of `sweepVisual`** — The sole import, pulling the shared sweep runner from the test-support layer.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — Provides the `sweepVisual` function actually executed here. This file is purely declarative; all navigation, screenshot, and comparison logic lives in that support module.

## Notes

- **Not in `npm run complete`.** Run explicitly with `npm run test:e2e:visual`.
- **Re-recording requires visual inspection.** Use `npm run test:e2e:visual:update` only after looking at the diff image; blind re-recording defeats the purpose of the suite.
- **Snapshots are co-located.** Baseline PNGs live in a `__snapshots__/` folder beside this file, so removing the wishlist module automatically removes its images (no orphaned artifacts in a central folder).
