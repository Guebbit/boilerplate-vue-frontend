# src/modules/admin/tests/e2e/a11y.cy.ts

## Purpose

Registers the admin module's routes for accessibility (a11y) end-to-end testing. It exists as a thin, co-located route list so that deleting the admin module automatically removes its a11y coverage — a central list would go stale. The actual audit logic is delegated to a shared sweep utility.

## Key elements

- **`sweepA11y('admin', [['admin dashboard', '/en/admin']], 'admin')`** — Single call that registers the admin route (`/en/admin`, labelled "admin dashboard") under the `'admin'` sweep name and scope. This is the entire test body of the file.

## Relationships

- **`tests/support/e2e/a11y-sweep.ts`** — Provides the `sweepA11y` function that performs the actual accessibility audit across the registered routes. This file only supplies the route data; all sweep mechanics live there.

## Notes

- The file is deliberately a **route list, not test logic**. Do not add test assertions here; extend the sweep utility in `a11y-sweep.ts` if the audit needs to change.
- Co-location is a contract: `tests/cross-cutting/a11y-coverage.spec.ts` asserts that every routed module has a file like this one, so silently removing this file without updating the cross-cutting check will break the build.
- New admin routes must be appended to the routes array in the `sweepA11y` call, or they will not be a11y-audited.
