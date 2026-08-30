# src/modules/products/tests/e2e/products.visual.cy.ts

## Purpose

Declares the screen list for the products module's visual-regression sweep. It is a thin "registration" file: it tells the shared sweep mechanism which URL and target selector to photograph, and nothing else. It exists so that deleting the products module also deletes its snapshot PNGs (stored in a sibling `__snapshots__/` folder) rather than leaving orphaned baselines in a central directory.

## Key elements

- **`sweepVisual('products', …)` call** — registers one screen for capture:
  - Screen id: `products-list`
  - Route: `/en/products`
  - Root selector: `#products-list-page`
- No other exports, classes, or functions. The file has a single executable statement.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — provides the `sweepVisual` helper. All navigation, waiting, and screenshot-taking logic lives there; this file only supplies the screen tuple. Changes to the sweep's timing, viewport, or snapshot-naming conventions are made in that support file, not here.

## Notes

- Not included in `npm run complete`. Invoke with `npm run test:e2e:visual`; regenerate baselines with `npm run test:e2e:visual:update`.
- The project convention (stated in the file header) is that re-recording **must** be preceded by visually inspecting the diff image. Blind re-recording is explicitly discouraged.
- Because baselines live in `__snapshots__/` adjacent to this file, moving or renaming this file without moving the snapshots will break the suite silently (Cypress will just create fresh baselines).
