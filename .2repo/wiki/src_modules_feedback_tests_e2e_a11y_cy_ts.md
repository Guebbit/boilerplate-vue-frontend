# src/modules/feedback/tests/e2e/a11y.cy.ts

## Purpose

Cypress e2e test that runs the shared `sweepA11y` accessibility sweep against the feedback module's routes on both the public and admin surfaces. It is co-located with the module so that deleting the feedback module removes its a11y coverage automatically, rather than leaving dangling route entries in a central list.

## Key elements

- **`sweepA11y('feedback — public', …)`** — Sweeps the public route `contact` (`/en/contact`) for accessibility violations.
- **`sweepA11y('feedback — admin', …, 'admin')`** — Sweeps the admin route `feedback inbox` (`/en/feedback`) with the `'admin'` surface flag, likely adjusting auth/context before running the audit.

## Relationships

- **`tests/support/e2e/a11y-sweep.ts`** — Provides the `sweepA11y` helper imported and invoked twice in this file. This is the only dependency; all a11y sweep logic lives in that shared utility.

## Notes

- The file is intentionally per-module (not a single central route list). A cross-cutting spec at `tests/cross-cutting/a11y-coverage.spec.ts` enforces that every routed module ships one of these files, preventing silent loss of a11y coverage when a domain is removed.
- Route entries are `[label, path]` tuples; the label is a human-readable name used in test output, not a selector.
