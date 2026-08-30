# src/modules/admin/tests/e2e/admin.visual.cy.ts

## Purpose

Visual regression test for the admin module's dashboard screen. It declares which screen to photograph and delegates all sweep mechanics to a shared helper, keeping this file to a one-line screen list. Baseline PNGs are colocated in a `__snapshots__/` directory beside this file so they are deleted together if the module is removed.

## Key elements

- **`sweepVisual` import** — pulled from `tests/support/e2e/visual-sweep.ts`; contains the actual screenshot-and-compare logic.
- **`sweepVisual('admin', [['admin-dashboard', '/en/admin', '#admin-page']], 'admin')`** — registers one screen for the sweep:
  - `'admin'` (1st arg): module name.
  - `[['admin-dashboard', '/en/admin', '#admin-page']]` (2nd arg): tuple of *test name*, *URL*, *CSS selector* to wait for before capturing.
  - `'admin'` (3rd arg): snapshot/prefix identifier used by the helper to name baseline files.

## Relationships

- **→ `tests/support/e2e/visual-sweep.ts`** — sole import. This file is a thin caller; all navigation, waiting, screenshotting, and comparison logic lives in that helper. No other imports or exports exist here.

## Notes

- **Not in `npm run complete`.** Run it via `npm run test:e2e:visual`.
- **Re-recording is gated by human review.** `npm run test:e2e:visual:update` overwrites baselines; the file's own docstring stresses you must *look at the diff image* first, or the suite loses its value.
- **Colocated baselines are intentional.** They live in `src/modules/admin/tests/e2e/__snapshots__/`, not in a central folder, so removing the admin module removes its PNGs automatically.
- **This file is expected to stay trivial.** Adding new screens means adding tuples to the array; any logic belongs in `visual-sweep.ts`.
