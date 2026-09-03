# src/modules/admin/tests/e2e/a11y.cy.ts

## Purpose

Declares the e2e accessibility sweep for the **admin** module's routes. It is co-located with the module so that deleting the admin module automatically removes its a11y coverage; a cross-cutting test (`tests/cross-cutting/a11y-coverage.spec.ts`) enforces that every routed module has exactly one of these files.

## Key elements

- **`PHONE`** — `const [390, 844]`; iPhone 14-class portrait width, below `DataTable.vue`'s `mobile-breakpoint` (the point where rows stack into cards).
- **`sweepA11y('admin', routes, 'admin')`** — call to the shared sweep helper that drives the actual axe / audit logic. The `routes` array contains:
  - A plain route: `['admin dashboard', '/en/admin']`.
  - A viewport-specific config for the audit tab at phone size, with a `prepare` callback that clicks the "Audit Log" tab and asserts list rows are present.

## Relationships

- **`tests/support/e2e/a11y-sweep.ts`** — provides the `sweepA11y` function that this file calls. The sweep file owns the test runner, axe injection, and assertion logic; this file supplies only the route list and any per-route setup (`prepare`, `viewport`).

## Notes

- The file intentionally contains **no test logic** of its own — all sweep mechanics live in `a11y-sweep.ts`. Adding a new admin route means appending an entry to the array here, not writing a new test.
- The `prepare` callback uses `cy.contains('[role=tab]', 'Audit Log').click()`; it is timing-sensitive (waits for the tab to be clickable) and then asserts `[data-test=list-row]` exists. If the tab label changes in the UI, this callback breaks silently (the sweep will report a failure rather than a compile error).
- The doc comment references `tests/cross-cutting/a11y-coverage.spec.ts` as the guard against silently losing a module's a11y coverage; that file is **not** imported here.
