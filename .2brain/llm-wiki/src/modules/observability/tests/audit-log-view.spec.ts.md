---
source: src/modules/observability/tests/audit-log-view.spec.ts
sha256: 2ffeb4698e9e6e970d6fb760f89ebf1429a96c1114c5214e4aca467e363352ea
generated_at: 2026-10-17T01:12:19.255151+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/audit-log-view.spec.ts

## Purpose

Verifies that `AuditLog.vue` reads the `target` query parameter from the URL and forwards it as a prop to `AdminAuditTab`. Proves that a plain `/audit` nav link and a record-specific "History" link (e.g. `?target=o1`) both resolve to the same page scoped correctly. `AdminAuditTab` itself is stubbed; its fetching logic is covered in `admin-audit-tab.spec.ts`.

## Key elements

- **`router`** — A `createMemoryHistory` router whose route tree is `/:locale` → `RouterView` → `collectModuleRoutes(enabledModules)`, mirroring production routing without a real server.
- **`mountAuditLog()`** — Mounts `AuditLog.vue` with the real router, Vuetify, and i18n plugins, while stubbing `AdminAuditTab` so only prop-passing is under test.
- **`describe('with no target query param')`** — Navigates to `/en/audit`, asserts `target` prop is `undefined` and `endpoint` is `'shop'`.
- **`describe('with a target query param')`** — Navigates to `/en/audit?target=o1`, asserts `target` prop equals `'o1'`.
- **`wireModulesIntoCore()`** — Called once at module scope to register enabled modules with the kernel registry before routes are collected.

## Relationships

- **`src/modules/observability/views/AuditLog.vue`** — The component under test; this spec mounts it and inspects what props it emits to its child.
- **`src/modules/observability/components/AdminAuditTab.vue`** — The child component; referenced for `getComponent()` assertions but stubbed out so its internal behavior is not exercised here.
- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore`, which registers enabled modules so `collectModuleRoutes` can build a realistic route tree.

## Notes

- `AdminAuditTab` is stubbed (`stubs: { AdminAuditTab: true }`), so the spec only verifies the *contract* (prop name and value), not the tab's rendering or data fetching.
- The route uses a `/:locale` prefix, so test URLs must include `/en/…` to match the real router shape.
- `loadLocale('en')` in `beforeEach` ensures the i18n instance is populated before assertions run; omitting it would leave translation keys unresolved.
