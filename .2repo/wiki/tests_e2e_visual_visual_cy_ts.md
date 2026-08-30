# tests/e2e/visual/visual.cy.ts

## Purpose

Visual regression test for the application shell — the two screens (home/landing page and the 404 error page) that don't belong to any domain module. All other visual baselines live under `src/modules/<name>/tests/e2e/__snapshots__/`; this file captures the orphaned screens that have no owning module.

## Key elements

- **`sweepVisual('the shell', [...])`** — Single call to the shared sweep helper. Registers two route/selector pairs:
  - `['home', '/en', '#home-page']` — landing page
  - `['not-found', '/en/this-route-does-not-exist', '#error-page']` — error page shown for an unknown route

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — Provides the `sweepVisual` function imported and called directly. That module handles the actual screenshot capture, pixel-diff comparison, and report generation.
- **`package.json`** — This file is deliberately excluded from the `npm run complete` script; it runs as a standalone report rather than a CI gate.

## Notes

- Pixel diff here is a **report, not a gate** — a failing snapshot does not block the pipeline. The rationale and the five conditions that must be frozen for the comparison to be meaningful are documented in `docs/tools/visual-regression.md`.
- If a new shell-level screen is added (no module ownership), add a row to the `sweepVisual` array rather than creating a separate spec file.
- The `commands.ts` neighbor in the graph is not directly imported by this file; any interaction would be indirect through the shared test environment setup.
