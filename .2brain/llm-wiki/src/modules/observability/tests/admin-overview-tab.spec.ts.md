---
source: src/modules/observability/tests/admin-overview-tab.spec.ts
sha256: fa85dcda75c27967532f566f75741bafdeba7bb75cbf296a516580359c376655
generated_at: 2026-10-02T15:18:31.968768+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/admin-overview-tab.spec.ts

## Purpose

Unit test suite (Vitest + Vue Test Utils) for the **parked-jobs / queues** card rendered inside `AdminOverviewTab.vue`. It was added as part of the CLEANUP_0917 work item and is intentionally scoped to that one section; every other KPI or section on the tab is out of scope.

## Key elements

- **`aHealth(queues)`** — builds a minimal, fully-populated `ObservabilityHealth` object with only the `queues` array varied; all other fields (status, dependencies, jobs, timestamp, etc.) are fixed to stable defaults.
- **`mountTab(health?)`** — mounts `AdminOverviewTab` with `loading: false` and the `vuetify` / `i18n` plugins. Accepts an optional health payload so the "no health yet" path can be exercised.
- **`beforeEach(() => loadLocale('en'))`** — resets the i18n locale to English before every test.
- **`describe('AdminOverviewTab — parked jobs')`** — three cases:
  - empty `queues` array → zero `[data-test=parked-queue-row]` elements.
  - `health` is `undefined` → zero rows (guards against a missing payload).
  - two queues with distinct names and parked counts → two rows, each containing the queue name and its parked number.

## Relationships

- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at module top-level (outside any `beforeEach`) to register shared Vue plugin modules (vuetify, i18n, etc.) into the app instance before any component is mounted.

## Notes

- The docblock explicitly warns this suite covers **only** the `queues` section; do not assume it guards other cards on the tab.
- DOM assertions use the `data-test=parked-queue-row` attribute selector, not a CSS class or ARIA role.
- `wireModulesIntoCore()` runs at import time (module scope), so any test file that imports this spec inherits that side-effect without calling the helper itself.
