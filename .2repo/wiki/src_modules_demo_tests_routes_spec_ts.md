# src/modules/demo/tests/routes.spec.ts

## Purpose

Vitest suite that pins down the demo module's public route surface: it asserts the Playground route exists, is publicly accessible, is guarded solely by `exampleGuard`, and is the *only* route declared. It exists because a silently lost guard would still render the Playground and the teaching case would vanish without any visible error.

## Key elements

- **`describe('demo routes')`** — top-level block containing three assertions.
- **"serves the Playground publicly"** — finds the route by name and asserts `meta.access` is `undefined` (i.e., no access restriction).
- **"runs the demo guard on the Playground route only"** — asserts `beforeEnter` is exactly `[exampleGuard]`.
- **"declares no route this file does not know about"** — closed-world check: the full list of route names must equal `['Playground']`, catching any accidentally added routes.

## Relationships

- **`src/modules/demo/routes.ts`** — default-imports the routes array under test; every assertion reads from this data.
- **`src/modules/demo/guards.ts`** — imports `exampleGuard` by name to compare against the route's `beforeEnter` array.

## Notes

- The third test is intentionally a *closed* assertion (exact array equality, not "contains"). Adding a new route to `routes.ts` will break this test until the expectation is updated — that is the point.
- The guard test checks `toEqual([exampleGuard])`, so wrapping the guard in an array or adding a second guard will fail.
