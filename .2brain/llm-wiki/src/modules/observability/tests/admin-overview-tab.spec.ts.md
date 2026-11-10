---
source: src/modules/observability/tests/admin-overview-tab.spec.ts
sha256: 04c2cf70b5f1b3d79cdbf995a4c9edd8328364d0245ac174fbc979b20b42ae40
signature: 93bc97c9530825400fadaa9f932aa1851edd6a24db61656ea1d2c34eeff28bb1
generated_at: 2026-11-10T04:53:14.466069+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/admin-overview-tab.spec.ts

## Purpose

Unit tests for the **parked-jobs (queues) section** of `AdminOverviewTab.vue`. The suite is intentionally scoped to that one card; every other KPI on the tab is a pure function of props not exercised here.

## Key elements

- **`aHealth(queues)`** — factory that returns a minimal valid `ObservabilityHealth` object with every field fixed except `queues`, so tests can focus on queue rendering.
- **`mountTab(health?)`** — mounts `AdminOverviewTab.vue` via `@vue/test-utils` with the `vuetify` and `i18n` plugins; accepts an optional health snapshot (defaults to `undefined`).
- **`beforeEach(() => loadLocale('en'))`** — ensures the English locale is loaded before each test.
- **`describe('AdminOverviewTab — parked jobs')`** — three cases:
  - Empty `queues` array → zero `[data-test=parked-queue-row]` elements.
  - `health` is `undefined` (not yet loaded) → zero parked-queue rows.
  - Two queues (`worker.email.send` parked 0, `worker.image.digest` parked 3) → two rows, each showing the correct name and parked count.

## Relationships

- **`src/modules/observability/components/AdminOverviewTab.vue`** — the component under test; this spec mounts it and asserts on its DOM output for the queues section.
- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore()`, called once at module scope to register shared module dependencies so the component resolves correctly in the Vitest environment.

## Notes

- The spec uses `data-test=parked-queue-row` attributes as the query selector; there is no dedicated CSS class contract.
- `wireModulesIntoCore()` is invoked at the top level (not inside `beforeEach`), so it runs once per test-file import rather than per test.
- The `aHealth` factory hard-codes `status: 'ok'` and `environment: 'test'`; tests that need other statuses must spread or override those fields.
