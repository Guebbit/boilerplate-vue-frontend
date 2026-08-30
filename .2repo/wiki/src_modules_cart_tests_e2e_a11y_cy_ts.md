# src/modules/cart/tests/e2e/a11y.cy.ts

## Purpose

Co-located accessibility (a11y) test for the cart module's routes. It exists in this module's directory so that deleting the cart module automatically removes its a11y coverage, preventing a stale central route list. A cross-cutting spec asserts every routed module has one of these files.

## Key elements

- **`sweepA11y('cart', [['cart', '/en/cart']], 'user')`** — Single call that runs the shared a11y sweep against the `/en/cart` route (labeled `"cart"`) under the `"user"` role. This is the entire functional content of the file.

## Relationships

- **`tests/support/e2e/a11y-sweep.ts`** — Provides the `sweepA11y` helper that this file imports and calls. The sweep contains the actual audit logic; this file is purely the route list for the cart domain.
- **`tests/cross-cutting/a11y-coverage.spec.ts`** (referenced in the module doc comment, not imported here) — Asserts that every routed module has a co-located a11y file like this one, enforcing that no domain silently loses coverage.

## Notes

- The routes array is a `[[label, path]]` pair. The label (`"cart"`) is used for reporting; the path (`/en/cart`) is the actual URL visited.
- The third argument (`"user"`) selects which authenticated role the sweep runs as.
- Adding a new cart route means appending another `[label, path]` entry to the existing array—no new imports or boilerplate required.
