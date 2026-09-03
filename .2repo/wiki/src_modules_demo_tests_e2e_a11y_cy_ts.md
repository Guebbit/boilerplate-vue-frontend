# src/modules/demo/tests/e2e/a11y.cy.ts

## Purpose

Registers the demo module's routes for the shared Cypress accessibility sweep. It exists so that deleting the demo module automatically removes its a11y coverage, and so the cross-cutting `a11y-coverage.spec.ts` can verify every routed module has a corresponding a11y file.

## Key elements

- **`sweepA11y('demo', …)` call** — Invokes the shared helper with the module identifier `'demo'` and a list of one route: `['playground', '/en/playground']`. This is the only runtime statement in the file; there are no local exports or additional test definitions.

## Relationships

- **`tests/support/e2e/a11y-sweep.ts`** — Sole dependency. Provides the `sweepA11y` function that drives the actual a11y assertions across the supplied routes. This file supplies the module name and route list; all sweep logic lives in the shared helper.

## Notes

- The route list is a flat array of `[label, path]` pairs. Adding a new routed page to the demo module requires appending an entry here; otherwise the cross-cutting coverage spec will flag the gap.
- The file is intentionally minimal (one import + one call). Do not add inline test logic — extend the shared `sweepA11y` helper instead.
