# src/modules/feedback/tests/e2e/a11y.cy.ts

## Purpose

Declares the a11y sweep route list for the feedback module. It feeds specific page routes (public contact page and admin feedback inbox) into the shared `sweepA11y` helper so that Cypress can run accessibility checks against both surfaces. The file exists per-module so that a11y coverage is co-located with the code it guards.

## Key elements

- **`sweepA11y('feedback — public', …)`** — Registers the public surface route (`/en/contact`) for the feedback module's a11y sweep.
- **`sweepA11y('feedback — admin', …, 'admin')`** — Registers the admin-surface route (`/en/feedback`) and flags it as an admin-level test (third positional argument to the helper).
- **Import of `sweepA11y`** — Pulls the shared sweep runner from `tests/support/e2e/a11y-sweep.ts`; this file itself contains no test logic, only the route list.

## Relationships

- **`tests/support/e2e/a11y-sweep.ts`** — Provides the `sweepA11y` function that this file calls. The sweep helper owns the actual a11y test execution; this file only supplies labels and route pairs.
- **`tests/cross-cutting/a11y-coverage.spec.ts`** (referenced in doc comments) — A cross-cutting spec that asserts every routed module has a co-located file like this one, preventing a module from silently dropping a11y coverage.

## Notes

- **Co-location is deliberate.** The file lives inside `src/modules/feedback/` so that deleting the feedback module also deletes its a11y routes. A centralized route list would go stale. The cross-cutting spec enforces that the co-location pattern is never skipped.
- **The file exports nothing.** It is a side-effect module: importing it (via Cypress spec discovery) registers the sweep. There are no named exports to import from elsewhere.
- **Route pairs are `[label, path]` tuples** passed to `sweepA11y`; the label is human-readable and appears in test titles.
