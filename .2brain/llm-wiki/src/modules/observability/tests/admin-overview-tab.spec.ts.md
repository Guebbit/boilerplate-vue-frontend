---
source: src/modules/observability/tests/admin-overview-tab.spec.ts
sha256: 04c2cf70b5f1b3d79cdbf995a4c9edd8328364d0245ac174fbc979b20b42ae40
generated_at: 2026-10-17T01:12:09.159266+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/admin-overview-tab.spec.ts

## Purpose

Scoped Vitest suite that verifies the **parked-jobs / queues card** on `AdminOverviewTab.vue`. The file's module docblock states explicitly that every other KPI and section on the tab is a pure function of props not exercised here, so this suite intentionally covers only the `queues` slice of the `ObservabilityHealth` payload.

## Key elements

- **`aHealth(queues)`** – factory that returns a minimal `ObservabilityHealth` object with all fields fixed except the `queues` array, keeping tests focused.
- **`mountTab(health?)`** – mounts `AdminOverviewTab` via `@vue/test-utils` with `vuetify` and `i18n` plugins; `loading` is always `false`.
- **`beforeEach → loadLocale('en')`** – ensures the English locale is active before each test so i18n assertions are deterministic.
- **`describe('AdminOverviewTab — parked jobs')`** – three cases:
  - empty `queues` array → zero `[data-test=parked-queue-row]` elements (section hidden).
  - `health` prop is `undefined` → same zero-row expectation.
  - two named queues (`worker.email.send` parked 0, `worker.image.digest` parked 3) → exactly two rows, each showing its queue name and parked count.

## Relationships

- **`src/modules/observability/components/AdminOverviewTab.vue`** – the SUT. The suite mounts it and asserts on its rendered DOM (queue rows, `data-test` hooks).
- **`tests/support/unit/wire-modules.ts`** – provides `wireModulesIntoCore()`, called once at module top-level before any `describe` block to register stubs/modules that the component tree expects during unit tests.

## Notes

- The suite relies on `[data-test=parked-queue-row]` as the sole selector; renaming that attribute in the component will break these tests without any type-level signal.
- `aHealth` hard-codes `status: 'ok'`, `environment: 'test'`, and a fixed `timestamp`. If the component branches on any of those fields, tests here will not reflect that path.
- The module is side-effectful: `wireModulesIntoCore()` runs at import time, so test-ordering or parallelisation strategies that isolate module state may need to account for it.
