---
source: src/modules/observability/tests/audit-log-view.spec.ts
sha256: 3e61383a1d51379b3c0ca2aa9fb84bca53a5fa25756f32fe0ebda025be860f70
generated_at: 2026-10-02T15:18:47.978041+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/audit-log-view.spec.ts

## Purpose

Unit test for `AuditLog.vue` that verifies the view reads the `target` query parameter off the URL and forwards it (or its absence) to `AdminAuditTab`. It proves that a "History" deep-link (`?target=o1`) and the plain `/audit` nav entry both resolve to the same page, scoped correctly. `AdminAuditTab` is fully stubbed; its data-fetching logic is covered by `admin-audit-tab.spec.ts`.

## Key elements

- **`mountAuditLog()`** – helper that mounts `AuditLog` with a memory router, Vuetify, i18n, and stubs for `LayoutDefault` (passthrough slot) and `AdminAuditTab` (boolean stub).
- **`router`** – `createMemoryHistory` router with a single `/:locale` route whose children come from `collectModuleRoutes(enabledModules)`. Tests use `router.push('/en/audit…')` before mounting.
- **"with no target query param"** – pushes `/en/audit`, asserts `AdminAuditTab` receives `endpoint: 'shop'` and `target: undefined`.
- **"with a target query param"** – pushes `/en/audit?target=o1`, asserts `AdminAuditTab` receives `target: 'o1'`.
- **`beforeEach`** – calls `loadLocale('en')` to ensure i18n is ready.

## Relationships

- **`tests/support/unit/wire-modules.ts`** – imports and calls `wireModulesIntoCore()` once at module load. This registers enabled modules into the core registry so that `collectModuleRoutes(enabledModules)` (used to build the test router) resolves to real route definitions.

## Notes

- `AdminAuditTab` is stubbed (`stubs: { AdminAuditTab: true }`) but the test still retrieves it via `wrapper.getComponent(AdminAuditTab)` to inspect props. This works because the stub preserves the component reference for prop assertions.
- The router is created with `createMemoryHistory`, not `createWebHistory`, so there is no real browser navigation; `router.push` must be `await`ed (via `.then()`) before mounting.
- Route collection depends on the `wireModulesIntoCore()` side-effect running before `collectModuleRoutes` is evaluated — if that import or call is removed, routes will be empty and navigation will fail silently.
