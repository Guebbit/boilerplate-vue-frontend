# src/modules/users/tests/e2e/users.visual.cy.ts

## Purpose

Declarative screen list for visual-regression testing of the users module. It feeds a single route entry (`users-list` → `/en/users`) into the shared `sweepVisual` helper so that a baseline screenshot is captured and compared on every visual run. The file exists per-module so that baselines (in a co-located `__snapshots__/` folder) are deleted together with the module, avoiding orphaned PNGs.

## Key elements

- **`sweepVisual('users', [['users-list', '/en/users', '#users-list-page']], 'admin')`** — The sole side-effect call. Registers one named screen (`users-list`) targeting the `/en/users` route, using `#users-list-page` as the capture anchor, under the `admin` role.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — Provides the `sweepVisual` function. All sweep logic (navigation, waiting, screenshotting, baseline comparison) lives there; this file only supplies the module name, the route table, and the auth role.

## Notes

- Run with `npm run test:e2e:visual`; re-record with `npm run test:e2e:visual:update`. It is **not** part of `npm run complete`.
- Baseline PNGs live in `__snapshots__/` **beside this file**, not in a central folder. Deleting the users module deletes its snapshots automatically.
- The doc comment explicitly warns: re-recording a baseline without visually inspecting the diff image invalidates the suite's purpose.
