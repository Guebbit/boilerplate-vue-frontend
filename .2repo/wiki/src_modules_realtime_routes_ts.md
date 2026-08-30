# src/modules/realtime/routes.ts

## Purpose

Declares the realtime module's route table—a single-route `RouteRecordRaw[]` that exposes the SSE observability playground at `playground/realtime`. The module registry splices this array into the application router at startup.

## Key elements

- **default export** — `RouteRecordRaw[]` containing one route record:
  - `path`: `'playground/realtime'`
  - `name`: `'RealtimePlayground'`
  - `meta`: `{ access: 'admin', title: 'realtime-playground-page.page-title' }` (i18n key)
  - `component`: lazy `import()` of `@/modules/realtime/views/RealtimePlayground.vue`

## Relationships

- **`src/modules/realtime/views/RealtimePlayground.vue`** — the sole component this route resolves to; loaded on demand via dynamic import.
- **`src/modules/realtime/module.ts`** — the module registry that consumes (splices) this route array into the app router.
- **`src/modules/realtime/tests/routes.spec.ts`** — unit tests exercising this route table's shape and values.

## Notes

- The array is cast with `as RouteRecordRaw[]` rather than annotated, so structural mismatches (e.g., a typo in a meta key) won't be caught by the type system.
- `meta.access: 'admin'` is consumed elsewhere (likely a router guard); there is no inline guard logic in this file.
- The `title` field is an i18n key, not a literal string—localization is resolved at render time by the consuming component or layout.
