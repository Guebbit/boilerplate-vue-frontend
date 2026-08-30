# src/modules/cart/tests/e2e/cart.visual.cy.ts

## Purpose

Visual regression test for the cart screen. It registers the cart page into a shared visual sweep so that a screenshot baseline is captured and compared on CI, catching unintended UI changes without requiring a dedicated test harness per screen.

## Key elements

- **`sweepVisual` call** — single invocation that registers the cart screen with the visual-sweep runner. Arguments: module name `'cart'`, a screen list `[['cart', '/en/cart', '#cart-page']]` (name, route, stable selector), and the auth role `'user'`.
- **`__snapshots__/`** (beside this file, not in the source tree) — where baseline PNGs are stored. The file docblock notes this keeps baselines co-located with the module so deleting the module also removes its photographs.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — provides the `sweepVisual` helper that this file calls. All sweep mechanics (viewport setup, screenshot capture, snapshot comparison, multi-breakpoint iteration) live in that support module; this file is purely a declarative screen-list entry point.

## Notes

- **Not in `npm run complete`.** Run explicitly with `npm run test:e2e:visual`.
- **Re-recording:** `npm run test:e2e:visual:update` overwrites baselines. The file docblock explicitly warns to inspect the diff image before re-recording — blind re-recording defeats the purpose of the suite.
- **Pattern, not logic:** this file contains no test bodies, assertions, or setup beyond the single `sweepVisual` call. If you need to understand how screenshots are taken or compared, read `visual-sweep.ts`.
