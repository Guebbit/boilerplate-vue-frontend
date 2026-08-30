# src/modules/demo/tests/e2e/a11y.cy.ts

## Purpose

Co-located accessibility test for the demo module. It registers the module's routes with the shared `sweepA11y` helper so that the demo's pages are included in the global a11y sweep. Keeping the file next to the module ensures that removing the module also removes its a11y coverage, and a cross-cutting spec (`tests/cross-cutting/a11y-coverage.spec.ts`) asserts that every routed module has exactly one such file.

## Key elements

- **`sweepA11y('demo', [['playground', '/en/playground']])`** — Single top-level call. Registers the demo module under the name `'demo'` with one route: `playground` at `/en/playground`. No local functions, classes, or exports are defined.

## Relationships

- **`tests/support/e2e/a11y-sweep.ts`** (import) — Provides the `sweepA11y` helper that actually runs the accessibility checks. This file only supplies the module name and route list; all sweep logic lives in that shared module.

## Notes

- The route list is a flat array of `[label, path]` tuples. To add a new page to the demo module's a11y coverage, append another `[label, path]` entry inside the existing inner array—do not create a second `sweepA11y` call.
- The file is intentionally side-effect-only (no test blocks of its own). It is not a standalone spec; it feeds the shared sweep, which is what actually executes the a11y assertions.
