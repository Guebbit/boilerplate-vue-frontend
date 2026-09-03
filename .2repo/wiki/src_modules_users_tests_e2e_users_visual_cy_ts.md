# src/modules/users/tests/e2e/users.visual.cy.ts

## Purpose

Declares the visual-regression routes for the **users** module so the shared `sweepVisual` harness knows which pages (and in-page anchors) to screenshot and compare. The file has no exports; its only runtime effect is the single `sweepVisual` call.

## Key elements

- **`sweepVisual('users', routes, 'admin')`** — registers the users module's visual targets:
  - Module tag: `'users'` (used for grouping in reports).
  - Routes array: `[['users-list', '/en/users', '#users-list-page']]` — each entry is a `[label, url, anchor]` tuple.
  - Auth role: `'admin'` (the session the sweep runs under).

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — provides the `sweepVisual` helper that this file imports and invokes. All visual-sweep mechanics (navigation, waiting, screenshot capture, baseline comparison) live there; this file only supplies the data.

## Notes

- **Not included in `npm run complete`.** Run with `npm run test:e2e:visual`.
- **Baseline updates are gated:** use `npm run test:e2e:visual:update` only *after* visually inspecting the diff image. Blind re-recording is discouraged.
- Adding a new users page to the sweep means appending another `[label, url, anchor]` tuple to the array—no other wiring required.
