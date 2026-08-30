# src/modules/realtime/tests/e2e/a11y.cy.ts

## Purpose

Co-located accessibility e2e test for the **realtime** module. It registers the module's routes with the shared `sweepA11y` runner so that axe assertions are executed against each route. Placing this file inside the module (rather than a central list) ensures that deleting the module automatically removes its a11y coverage.

## Key elements

- **`sweepA11y` call** — Registers one route for the realtime module:
  - Module key: `'realtime'`
  - Routes: `[['realtime playground', '/en/playground/realtime']]`
  - Auth role: `'admin'`

## Relationships

- **`tests/support/e2e/a11y-sweep.ts`** — Provides the `sweepA11y` function imported here. That module visits each registered route in the browser and runs axe-core accessibility assertions against the rendered page. This file is purely the route/role declaration; all sweep logic lives in the support module.

## Notes

- Coverage completeness is enforced by `tests/cross-cutting/a11y-coverage.spec.ts`, which asserts that every routed module ships a file like this one. Adding a new route to the realtime module without updating this list will fail that guard.
- The file is a side-effect import (no exports). Test runners pick it up by file path, not by import.
