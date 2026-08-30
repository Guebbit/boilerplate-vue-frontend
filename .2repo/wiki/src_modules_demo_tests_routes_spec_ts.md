# src/modules/demo/tests/routes.spec.ts

## Purpose

Vitest spec that pins the demo module's public route contract: the single `Playground` route must be publicly accessible (no `access` meta) and guarded exclusively by `exampleGuard`. It exists so that silently dropping the teaching guard or adding an undeclared route causes an immediate test failure rather than a quiet behavioral regression.

## Key elements

- **`describe('demo routes')`** — top-level suite containing three focused assertions.
- **`it('serves the Playground publicly')`** — asserts a route named `Playground` exists and that `meta.access` is `undefined` (i.e., no access restriction).
- **`it('runs the demo guard on the Playground route only')`** — asserts `beforeEnter` is exactly `[exampleGuard]`, catching both a missing guard and any extra guards.
- **`it('declares no route this file does not know about')`** — asserts the full route name list is exactly `['Playground']`, acting as a completeness check against accidental new routes.

## Relationships

- **`src/modules/demo/routes.ts`** — default-imports the routes array; every assertion in this spec operates on that exported list.
- **`src/modules/demo/guards.ts`** — imports `exampleGuard` by name to compare identity against the `beforeEnter` array on the Playground route.

## Notes

- The third test is intentionally a strict-equality guard on the *entire* route list. Adding a new route to `routes.ts` without updating this spec will fail the build, enforcing that the test file stays in lockstep with the route surface.
- `beforeEnter` is compared with `toEqual([exampleGuard])`, which checks both the guard's identity and that no other guards are present.
