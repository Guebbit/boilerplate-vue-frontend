# src/modules/wishlist/tests/e2e/a11y.cy.ts

## Purpose

Declares the accessibility (a11y) route coverage for the wishlist module. It is a thin co-located wrapper that feeds the wishlist's route into the shared a11y sweep utility, ensuring that removing the wishlist module automatically removes its a11y test with it.

## Key elements

- **`sweepA11y` call** — Single invocation: `sweepA11y('wishlist', [['wishlist', '/en/wishlist']], 'user')`. Registers the wishlist label, its route path (`/en/wishlist`), and the `user` auth tier for the shared sweep.
- **No exports** — The file has no public API; its side effect (registering the route with the sweep runner) is the entire contract.

## Relationships

- **`tests/support/e2e/a11y-sweep.ts`** — Imports and calls `sweepA11y`. That file contains the actual a11y scanning/sweep logic; this file is purely the route-list declaration for the wishlist domain.

## Notes

- A cross-cutting spec (`tests/cross-cutting/a11y-coverage.spec.ts`) asserts that every routed module has a co-located file like this one. Omitting or renaming this file will cause that spec to fail.
- The route list is a two-element tuple per entry: `[label, path]`. Adding a new wishlist route (e.g., a detail page) means appending another tuple to the array, not creating a new file.
- The `user` string is the auth tier required to access the route; it is passed through to the sweep runner for session setup.
