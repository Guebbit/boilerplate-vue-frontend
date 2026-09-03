# src/modules/realtime/routes.ts

## Purpose

Defines the realtime module's route table — a single `RouteRecordRaw` entry for the SSE observability playground. The array is spliced into the app-level router by the module registry, making this the module's sole navigation entry point.

## Key elements

- **Default export** — A typed array (`RouteRecordRaw[]`) containing exactly one route record.
  - `path: 'playground/realtime'` — the URL segment.
  - `name: 'RealtimePlayground'` — programmatic-navigation handle.
  - `meta.access: 'admin'` — restricts the route to admin roles (enforced by app-level guards, not here).
  - `meta.title: 'realtime-playground-page.page-title'` — i18n key for the page title.
  - `component` — dynamic `import()` of `@/modules/realtime/views/RealtimePlayground.vue`, so the view chunk loads only on navigation.

## Relationships

- **`src/modules/realtime/module.ts`** — The module registry imports this default export and splices it into the global router. This file is a pure data module with no logic; all routing behavior lives in the registry and app-level guards.
- **`src/modules/realtime/tests/routes.spec.ts`** — Unit tests that assert the shape, naming, and meta fields of the exported route record.

## Notes

- The file contains no runtime logic — it is a static data declaration. Any routing behavior (guards, lazy-load timing, 404 fallback) is handled upstream by the module registry and the app shell.
- The `as RouteRecordRaw[]` cast at the end is a type assertion, not a runtime conversion; the literal array is already structurally compatible.
- Because the component is loaded via a dynamic `import()`, the playground view is split into its own webpack/vite chunk. Adding more routes to this array will not increase the initial bundle unless they use the same view.
