# src/modules/feedback/tests/e2e/feedback.visual.cy.ts

## Purpose

Declares the list of screens in the feedback module that require visual-regression snapshots, delegating the actual sweep logic to the shared `sweepVisual` helper. This file exists so that deleting the feedback module also removes its baselines (they live in a local `__snapshots__/` folder) and so the route list stays co-located with the code it tests.

## Key elements

- **`sweepVisual('feedback', [...])`** — The single call in this file. Passes the module name `'feedback'` and an array of route tuples. Each tuple is `[label, url, anchorSelector]`; here there is one entry: `['contact', '/en/contact', '#contact-page']`, meaning the screenshot is of the `#contact-page` element on `/en/contact`.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — Provides the `sweepVisual` function imported at the top of this file. All sweep mechanics (navigation, waiting, capture, snapshot comparison) live there; this file only supplies the route list.

## Notes

- **Local baselines:** Snapshots are stored in `__snapshots__/` beside this file, not in a central directory. This is intentional — it prevents orphaned PNGs of screens the app no longer serves.
- **Not in the default pipeline:** This test is excluded from `npm run complete`. Run it with `npm run test:e2e:visual`.
- **Re-recording discipline:** Use `npm run test:e2e:visual:update` only after visually inspecting the diff image. The file's own comment calls out re-recording without looking as "the one thing that makes this suite worthless."
- **Adding a screen:** To cover another route in the feedback module, append a `[label, url, anchorSelector]` tuple to the array passed to `sweepVisual`. No other boilerplate is needed.
