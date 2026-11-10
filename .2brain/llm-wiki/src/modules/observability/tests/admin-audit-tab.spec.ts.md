---
source: src/modules/observability/tests/admin-audit-tab.spec.ts
sha256: 474995087b9992b23f15b5892b981d4629282a3d03eb6df20be06468c1dc5522
signature: c9cdbf4c4bd9c3c0be359e564502f1734cd164027b9aab9f53241a1009932f9f
generated_at: 2026-11-10T04:53:05.737958+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/admin-audit-tab.spec.ts

## Purpose

Vitest spec for `AdminAuditTab.vue` that covers the component's self-fetching behavior — the initial load on mount, the `target` prop reaching the request, and the filter form's search re-fetching through the same endpoint. It exists as the companion to `use-audit-trail.spec.ts`, which tests the composable in isolation; this file tests the component-level wiring around it.

## Key elements

- **`mountTab(props)`** — Mounts `AdminAuditTab` with an `endpoint` prop (`'platform' | 'shop'`) and optional `target`, wiring in Vuetify, i18n, Pinia, and a memory-history router.
- **`mountWith(items)`** — Stubs `listAuditEntries` to resolve a specific item array, then mounts the shop trail.
- **`rowOn(targetType?, targetId?)` / `refundRow(metadata)`** — Factories for single audit-row fixtures.
- **`EMPTY_PAGE`** — The default empty paginated response both endpoints return in the base mock.
- **`@api` mock** — Partially mocks `listObservabilityAuditEntries` and `listAuditEntries` via `vi.mock`, preserving other `@api` exports.
- **`router`** — A memory-history router carrying real module routes (via `collectModuleRoutes(enabledModules)`), needed so target links resolve to real paths.
- **Test suites** — `endpoint selection`, `the filter form`, `the target and own-order filters (shop trail)`, `the target column`, `the correlation ids`, `own money`, `list state in the URL`.

## Relationships

- **`src/modules/observability/components/AdminAuditTab.vue`** — The component under test; all assertions target its rendered DOM and its calls into the API layer.
- **`contracts/rest/index.ts`** — The source of the schema definitions imported as `@api/schemas`; the test uses those schemas with `contractResponse`/`contractBody` to build contract-valid fixture payloads the component can consume.
- **`tests/support/unit/orval-fixture-schema.ts`** — Provides `contractResponse` and `contractBody` helpers that wrap plain objects into schema-shaped responses.
- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore()`, called at module top-level so the registry-based router has real module routes registered.

## Notes

- The file's doc comment explicitly positions itself as covering what `use-audit-trail.spec.ts` does **not**: component mount, prop propagation, and form submission.
- `wireModulesIntoCore()` is called once at module scope (not in `beforeEach`), so it runs before any test in this file.
- `beforeEach` pushes the router to `/en/audit` and calls `loadLocale('en')`; tests that need a different query string (e.g., the "list state in the URL" suite) push again.
- The platform endpoint's contract intentionally has no `target` or `ownOrder` filter; tests assert the UI hides those controls for `'platform'`.
- The file is truncated in the dependency graph snapshot; the final `list state in the URL` suite is only partially visible.
