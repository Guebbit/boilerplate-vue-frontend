---
source: src/modules/tasks/tests/detail-view.spec.ts
sha256: c7bd884e8af56deb8e879812aa893e1b5436c827121f3da19abf0966b2c1f2ca
signature: 2f140c8b3e05215786c3ce7c612e9c261b01ba596a7c1233f1d399b1f768aff7
generated_at: 2026-11-10T05:58:02.077590+00:00
model: ollama:qwen3.8:27b
---

# src/modules/tasks/tests/detail-view.spec.ts

## Purpose

Integration-style unit test that mounts the **real** `TaskDetail.vue` page over the shared MSW server, exercising routing, i18n, session state, and the two write operations (assign / add-note) end-to-end within a single browser-less process.

## Key elements

- **`openDetail(task)`** — Helper that registers a `GET */tasks/t1` handler, navigates the in-memory router to `/en/tasks/t1`, mounts `TaskDetail` with the real plugins (router, vuetify, i18n), and flushes promises before returning the wrapper.
- **`beforeEach` (top-level)** — Creates a fresh Pinia instance, sets the session viewer to `staff-1 / sam@example.com`, registers POST handlers for `*/tasks/t1/assign` and `*/tasks/t1/notes` that capture request bodies into `assignBodies` / `noteBodies` and return fixture-shaped responses, and loads the `en` locale.
- **`describe('TaskDetail reference')`** — Asserts the displayed ref is the last 8 hex chars of the task id (e.g. `#702aaaaa`).
- **`describe('TaskDetail unknown kind')`** — Stubs `PROD=true` / clears `VITE_CONTRACT_THROW` so validation is report-only; feeds an unknown `kind` via spread (to bypass the fixture's own contract check) and asserts the UI shows a generic word rather than a raw i18n key.
- **`describe('TaskDetail take')`** — Clicks the take button, verifies the POST body is `{ userId: 'staff-1' }`, the assignee chip updates, and the button disappears.
- **`describe('TaskDetail take label')`** — Three label/visibility variants: "Take over" (another user holds it), "Take" (unassigned), and button hidden (viewer already holds it).
- **`describe('TaskDetail notes')`** — Sets a draft with surrounding whitespace, submits, and verifies the trimmed body is sent, rendered, and the textarea is emptied. Second case asserts the composer is absent when `actions.note` is `false`.

## Relationships

- **`src/modules/tasks/views/TaskDetail.vue`** — The component under test; imported directly and mounted.
- **`tests/support/unit/fixtures.ts`** — Supplies the `aTask()` factory used to build task payloads for both the mocked responses and the page-opened scenario.
- **`tests/support/unit/msw-server.ts`** — This file imports the shared `server` instance from this module and registers per-test request handlers on it.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at module scope so the kernel registry and module routes resolve before the router is created.

## Notes

- `wireModulesIntoCore()` runs as a **module-level side effect** (outside any hook); tests depend on it having already executed.
- The "unknown kind" test spreads `aTask()` and overwrites `kind` *after* the fixture call, specifically to avoid the fixture's internal contract validator rejecting the fabricated value.
- The router uses `createMemoryHistory` and the **real** `collectModuleRoutes(enabledModules)` route table, not a stubbed route list—so any change to module registration affects these tests.
- Request-body assertions (`assignBodies`, `noteBodies`) are captured in MSW handler closures, not in a separate spy, so ordering is implicitly tied to handler invocation.
