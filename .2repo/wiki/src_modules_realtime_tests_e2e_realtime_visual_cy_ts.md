# src/modules/realtime/tests/e2e/realtime.visual.cy.ts

## Purpose

Registers the realtime module's screen with the shared `sweepVisual` visual-regression runner so that a screenshot of the page is captured and diffed against a stored baseline. This file acts purely as a declaration (screen list); all sweeping logic lives elsewhere.

## Key elements

- **`sweepVisual('realtime', [[…]], 'admin')`** — The single call that declares the module's screens to the shared runner. Arguments:
  - Module name: `'realtime'`
  - Screen list: one entry `['realtime-playground', '/en/playground/realtime', '#realtime-playground-page']` (test label, route, ready-selector)
  - Auth role: `'admin'`
- **Import** — `sweepVisual` from `tests/support/e2e/visual-sweep.ts`.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — Provides the `sweepVisual` function that this file calls. That module iterates over the declared screens, navigates to each route, waits for the ready selector, captures a screenshot, and diffs it against the baseline. This file contributes no logic; it only supplies the screen metadata.

## Notes

- Baseline PNGs live in a `__snapshots__/` folder **beside this file**, not in a central directory. Deleting the module folder also removes its screenshots.
- This suite is **excluded from `npm run complete`**. Run it with `npm run test:e2e:visual`.
- Re-recording baselines (`npm run test:e2e:visual:update`) should only be done after visually inspecting the diff image; re-recording without looking is explicitly called out as defeating the purpose of the suite.
- The ready selector (`#realtime-playground-page`) is what tells the sweep when the screen has finished loading before capturing.
