---
source: src/modules/tasks/tests/inbox-view.spec.ts
sha256: 1460ba794867e5380a71b8b699b4b675c990308cc2907abfca1ee071f1724bb3
signature: ebeb12679974b08fadf8244aa64eec61bd04e7b6d08f2eca12cfa5c6748106e7
generated_at: 2026-11-10T05:59:39.797072+00:00
model: ollama:qwen3.8:27b
---

# src/modules/tasks/tests/inbox-view.spec.ts

## Purpose

Vitest spec that mounts the real `TaskInbox` component over the shared MSW server and verifies four behaviors: URL query parameters reach the `POST /tasks/search` body, a typed text filter is sent on form submit, the short task reference renders correctly per row, and the "take" action assigns the task to the signed-in viewer. All app layers (store, generated client, interceptors, router) are real; only the network wire is faked.

## Key elements

- **`wireModulesIntoCore()`** — called at module scope (before any test runs) to register the tasks module's routes and handlers into the kernel registry.
- **`router`** — a real app router built with `createMemoryHistory` and `collectModuleRoutes(enabledModules)`; the inbox reads filters off this address.
- **`searchBodies` / `assignBodies`** — mutable accumulators that capture the JSON body of every `POST /tasks/search` and `POST /tasks/t1/assign` request intercepted by MSW.
- **`openInbox(address)`** — helper that navigates the router to `address`, awaits `isReady`, mounts `TaskInbox` with `router`, `vuetify`, and `i18n` plugins, then flushes promises.
- **`beforeEach`** — resets Pinia, clears body accumulators, registers per-test MSW handlers for the two endpoints (search returns a single assignable task; assign returns the task with the new assignee), and loads the `'en'` locale.
- **`describe('TaskInbox filters')`** — two tests asserting that address query params (`status`, `assignee`, `overdue`, `kind`) appear in the first search body, and that a form-submitted text input produces `{ text: 'parcel', page: 1 }`.
- **`describe('TaskInbox reference')`** — asserts the `data-test=task-ref` element shows `#702aaaaa` for a given task id.
- **`describe('TaskInbox unknown kind')`** — stubs `PROD` + clears `VITE_CONTRACT_THROW` to run in report-only validation mode; feeds an unknown `kind` value and asserts the row shows the generic word "Task" rather than a raw `task-kind.` i18n key.
- **`describe('TaskInbox take')`** — sets the session viewer, clicks the `data-test=task-take` button, and asserts the assign body is exactly `{ userId: 'staff-1' }`.

## Relationships

- **`src/modules/tasks/views/TaskInbox.vue`** — the component under test; mounted directly via `@vue/test-utils`.
- **`tests/support/unit/fixtures.ts`** — provides the `aTask()` factory used to build MSW response bodies (search results, assign response, unknown-kind task).
- **`tests/support/unit/msw-server.ts`** — provides the shared `server` instance that this file imports and calls `.use()` on to register per-test endpoint handlers.
- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore()`, called once at module top-level so the kernel registry knows about the tasks module before the router is built.

## Notes

- `wireModulesIntoCore()` is a side-effect at import time, not inside a test. If module registration state leaks between test files in the same worker, this can cause route duplicates.
- The "unknown kind" test deliberately spreads `aTask(...)` and then overwrites `kind` with an invalid value *after* the fixture's own contract check has already passed, so the fixture's guard does not reject the payload.
- The "unknown kind" test depends on `isReportOnly` behavior in `src/infrastructure/http/validate.ts`; if that mode changes to throw, the test will need updating.
- The router uses `createMemoryHistory`, so tests are independent of browser history state, but the inbox must be reachable under the `/:locale` parent route for query-param filtering to work.
