# src/modules/realtime/tests/e2e/realtime.visual.cy.ts

## Purpose

Registers the realtime playground screen with the shared `sweepVisual` visual-regression runner so its rendered output is screenshot-diffed against a stored baseline. It exists so that unexpected visual changes to the realtime module are caught in CI or local runs without manual eyeballing.

## Key elements

- **`sweepVisual(...)` call** — the sole executable statement. Args:
  - `'realtime'` — module/screen group name.
  - `[['realtime-playground', '/en/playground/realtime', '#realtime-playground-page']]` — one screen entry: test name, route path, and the DOM selector that signals the page is fully rendered (ready state).
  - `'admin'` — the authenticated role under which the screenshot is captured.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — provides the `sweepVisual` runner. This file is a thin registration: all navigation, waiting, screenshotting, and diff logic lives in that module. Changing sweep behavior affects this test without editing it.

## Notes

- **Not in `npm run complete`.** Run explicitly with `npm run test:e2e:visual`.
- **Baseline re-recording** (`npm run test:e2e:visual:update`) is gated by process: the JSDoc header instructs you to inspect the diff image first. Blindly updating baselines can mask real regressions.
- The ready selector (`#realtime-playground-page`) is the only stability signal; if the page renders lazily after that element appears, the screenshot may capture a partially loaded state.
