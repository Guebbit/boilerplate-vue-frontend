---
source: src/modules/observability/tests/audit-log-view.spec.ts
sha256: 17d3900516b2abce3087832a3dac2dd7a84742fc3b75155181a910e25cb13768
signature: 8fef0eb91ded071b4cc0e473727efa76311f4910d40d3226c532d00be34d74c7
generated_at: 2026-11-10T04:53:44.800708+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/audit-log-view.spec.ts

## Purpose

Vitest spec that proves one contract: `AuditLog.vue` reads the `target` value from its own query string and passes it straight through to `AdminAuditTab`. This ensures both a record-specific "History" link (e.g. `?target=o1`) and the plain `/audit` nav entry land on the same page scoped correctly.

## Key elements

- **`wireModulesIntoCore()`** — called at module load; registers module routes so the test router can resolve them.
- **`router`** — a `createMemoryHistory` Vue router carrying the real collected module routes under `/:locale`.
- **`mountAuditLog()`** — helper that mounts `AuditLog.vue` with the router, Vuetify, and i18n plugins; stubs `AdminAuditTab`.
- **`beforeEach`** — loads the `'en'` locale via `loadLocale`.
- **`describe('with no target query param')`** — pushes `/en/audit`, asserts `endpoint` is `'shop'` and `target` via `toBeUndefined()`.
- **`describe('with a target query param')`** — pushes `/en/audit?target=o1`, asserts `target` prop equals `'o1'`.

## Relationships

- **`src/modules/observability/components/AdminAuditTab.vue`** — declared as a stub (`stubs: { AdminAuditTab: true }`); only its received props are asserted, not its internal behavior.
- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore`, which this spec calls once at import time to make module routes available to the test router.

## Notes

- `AdminAuditTab` is fully stubbed — no fetching or rendering logic from that component runs here.
- The test relies on `router.push` resolving before `mountAuditLog()` is called, so the component reads its query string from the already-navigated router state rather than from a direct prop injection.
- The module-level JSDoc explicitly scopes this file to the single pass-through contract; internal `AdminAuditTab` behavior is out of scope here.
