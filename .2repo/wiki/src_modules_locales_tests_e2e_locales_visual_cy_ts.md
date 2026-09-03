# src/modules/locales/tests/e2e/locales.visual.cy.ts

## Purpose

Registers three locales-module screens (list, dictionary, per-locale entries) with the shared `sweepVisual` visual-regression runner so that each screen is captured as a screenshot and diffed against a stored baseline. It exists to catch unintended visual regressions in the locales admin pages.

## Key elements

- **`sweepVisual('locales', …, 'admin')`** — top-level call that enrolls the module. The first argument is the module label, the third is the auth role used for the session.
- **Screen entries (tuples of `[label, path, readySelector]`)**
  - `locales-list` → `/en/locales`, ready when `[data-test=list-row]` appears (data has loaded, not just the shell).
  - `locales-dictionary` → `/en/locales/dictionary`, ready when `[data-test=dictionary-missing-count]` appears (waits for the last language's baselines so header counts are fully computed).
  - `locale-entries` → `/en/locales/it`, ready when `[data-test=list-row]` appears.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — provides the `sweepVisual` function imported here. It handles navigation, waiting on the ready selector, taking the screenshot, and comparing it to the baseline. This file is purely declarative data fed into that runner.

## Notes

- **Not in `npm run complete`.** Run with `npm run test:e2e:visual`; re-record baselines with `npm run test:e2e:visual:update`.
- **Always inspect the diff image before re-recording.** The docblock explicitly warns that blind re-recording can bake in real regressions.
- **Ready selectors target data rows, not the page shell.** The shell renders before the API responds; a loading-state screenshot is "stable, meaningless, and never fails." The dictionary screen's selector is deliberately the *last* computed value (missing-count) rather than the first row, to avoid capturing half-computed header counts.
