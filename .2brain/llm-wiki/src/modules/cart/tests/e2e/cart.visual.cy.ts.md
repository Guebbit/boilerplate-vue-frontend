---
source: src/modules/cart/tests/e2e/cart.visual.cy.ts
sha256: 399a1fbadbe4f1374448641182c4f686bce95c161b20dacd6576cf8f8b7bb77f
generated_at: 2026-10-17T00:39:46.166906+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/e2e/cart.visual.cy.ts

## Purpose

Registers the cart screen for the project-wide visual-regression sweep. This file is a *screen list*, not a test suite: it tells `sweepVisual` which URL and root element to photograph for the cart.

## Key elements

- **`sweepVisual('cart', [['cart', '/en/cart', '#cart-page']], 'user')`** — the sole executable line. Declares one screen (`cart`) at route `/en/cart` with root selector `#cart-page`, to be captured while logged in as a `user` role.
- **`import { sweepVisual }`** — pulls the sweep driver from the shared support file (see Relationships). No other imports, no local helpers, no exports.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — provides `sweepVisual`, the actual capture/comparison engine. This file is its caller; it supplies the screen definition and lets the support module handle navigation, waiting, and screenshotting.
- **`__snapshots__/` (sibling directory)** — stores the baseline PNGs for this screen. They are deliberately co-located so that deleting the cart module also removes its photographs.

## Notes

- Not included in `npm run complete`. Invoke with `npm run test:e2e:visual`; re-baseline with `npm run test:e2e:visual:update` **only after inspecting the diff image**.
- The file is marked `@module` (side-effect import) — there is nothing to import from it.
- Adding a new cart sub-screen means appending an entry to the array argument; the sweep logic itself never changes here.
