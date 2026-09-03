# src/modules/feedback/tests/e2e/feedback.visual.cy.ts

## Purpose

Declares the list of routes (one entry) for the feedback module's visual-regression test run. It hands that list to the shared `sweepVisual` helper, which orchestrates the actual screenshot capture and comparison. This file exists so each module's visual targets live alongside that module rather than in a monolithic central file.

## Key elements

- **`sweepVisual('feedback', [...])`** – Single top-level call. Registers one visual target: route name `contact`, URL `/en/contact`, screenshot anchor `#contact-page`. The module key `'feedback'` namespaces the generated screenshot filenames.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** – Provides the `sweepVisual` function that this file imports. That helper is responsible for navigating each listed route, waiting for the anchor element, and performing the pixel-level screenshot comparison (or recording, in update mode). This file only supplies the data; all test logic lives in the helper.

## Notes

- **Not included in `npm run complete`.** Run it explicitly with `npm run test:e2e:visual`.
- **Re-recording is manual and deliberate.** Use `npm run test:e2e:visual:update` *only* after visually inspecting the diff image—there is no automated "approve" step.
- The file has no other exports; it is a side-effect module whose sole purpose is the `sweepVisual` call.
