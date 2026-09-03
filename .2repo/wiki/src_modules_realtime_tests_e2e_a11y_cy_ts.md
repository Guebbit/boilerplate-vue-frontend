# src/modules/realtime/tests/e2e/a11y.cy.ts

## Purpose

Registers the **realtime** module's e2e accessibility (a11y) coverage by declaring its route to the shared `sweepA11y` runner, which visits the page and asserts axe results. It is co-located with the module so that deleting the module removes its a11y test with it, preventing a central list from referencing dead routes.

## Key elements

- **`sweepA11y('realtime', [['realtime playground', '/en/playground/realtime']], 'admin')`** — Registers one route ("realtime playground" at `/en/playground/realtime`) under the `realtime` module namespace, authenticated as the `admin` role. The runner (imported from `a11y-sweep.ts`) handles the visit and axe assertions.

## Relationships

- **`tests/support/e2e/a11y-sweep.ts`** — Provides the `sweepA11y` function that this file calls. The sweep visits each registered route and asserts against axe; this file merely supplies the route metadata.

## Notes

- A cross-cutting test (`tests/cross-cutting/a11y-coverage.spec.ts`) asserts that every routed module has a co-located file like this one, so a new module cannot be added without a11y coverage.
- The file contains no test logic of its own; all axe assertions live in the shared `a11y-sweep` runner.
- The third argument (`'admin'`) is the auth role passed to the runner, not a Playwright `cy.login` call made here.
