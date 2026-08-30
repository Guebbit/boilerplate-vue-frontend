# src/modules/demo/routes.ts

## Purpose

Defines the route table for the demo module: a single `playground` route that lazy-loads its view component and is protected by the teaching `exampleGuard`. The file exists so the app's module registry can mount demo navigation without the guard leaking into other routes.

## Key elements

- **Default export** — An array of `RouteRecordRaw` (vue-router) containing one record:
  - `path: 'playground'`, `name: 'Playground'`
  - `meta.title` set to the i18n key `playground-page.page-title`
  - `beforeEnter: [exampleGuard]` — the guard is scoped to this route rather than registered globally
  - `component` — lazy-imports `@/modules/demo/views/Playground.vue`

## Relationships

- **`src/modules/demo/guards.ts`** — Provides `exampleGuard`, which is imported and attached as the `beforeEnter` guard on the `playground` route.
- **`src/modules/demo/module.ts`** — Consumes this file's default export to register the route in the app's module registry.
- **`src/modules/demo/tests/routes.spec.ts`** — Unit-tests the route table exported by this file.

## Notes

- The guard is deliberately scoped per-route (`beforeEnter`) instead of being a global `router.beforeEach` hook, so that removing the demo module in a production build also removes the guard with no side effects on other navigations.
- The `meta.title` value is an i18n key, not a literal string; consumers must resolve it through the app's i18n provider.
- The file uses a type-only import (`import type { RouteRecordRaw }`) and a relative ESM import with the `.ts` extension — follow the same convention if extending the table.
