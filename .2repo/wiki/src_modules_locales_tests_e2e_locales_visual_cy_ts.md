# src/modules/locales/tests/e2e/locales.visual.cy.ts

## Purpose

Visual regression test for the locales module's screens. It registers three screen/URL/selector triples with the shared `sweepVisual` runner, which visits each screen, waits for the ready selector, and diffs a screenshot against a stored baseline. It exists so that unintended UI changes in the locales admin screens are caught before reaching production.

## Key elements

- **`sweepVisual('locales', [...], 'admin')`** — the single call that drives the entire file. It declares three entries, each a `[name, url, readySelector]` tuple:
  - `locales-list` → `/en/locales` → `[data-test=list-row]`
  - `locales-dictionary` → `/en/locales/dictionary` → `[data-test=dictionary-missing-count]`
  - `locale-entries` → `/en/locales/it` → `[data-test=list-row]`

  The third argument `'admin'` sets the authenticated role for the sweep.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — exports `sweepVisual`, the runner that iterates over the declared screens, navigates, waits for the ready selector, captures a screenshot, and compares it to the baseline in `__snapshots__/`. This file is the only consumer in the locales module; the sweep logic is shared across all modules that register screens the same way.

## Notes

- Baselines (PNG files) live in `__snapshots__/` **beside this file**, not in a central directory, so deleting the module also removes its baselines.
- Not included in `npm run complete`. Run explicitly with `npm run test:e2e:visual`.
- Re-record baselines with `npm run test:e2e:visual:update` **only after visually inspecting** the diff image. The file's own comments call out that blind re-recording is "the one thing that makes this suite worthless."
- Ready selectors target **data rows or late-arriving elements**, deliberately avoiding the page shell. A shell-based selector would capture the loading state, which is stable but meaningless and would never fail. The dictionary screen specifically waits for `[data-test=dictionary-missing-count]` because header counts arrive with the last language's baselines, well after the first row renders.
