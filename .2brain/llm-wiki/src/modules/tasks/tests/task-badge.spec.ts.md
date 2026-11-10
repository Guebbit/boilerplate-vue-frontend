---
source: src/modules/tasks/tests/task-badge.spec.ts
sha256: 872ac40b4c2c20235b02f187648e7d4a41be3f0650b527f2c7b0870bfd7855fd
signature: 5ef87aa34c61950bf73010a7614c804075ab5e06cf499e54dc70e05747a6cc41
generated_at: 2026-11-10T06:01:10.759793+00:00
model: ollama:qwen3.8:27b
---

# src/modules/tasks/tests/task-badge.spec.ts

## Purpose

Unit tests for the task-inbox navigation badge (`composables/use-task-badge.ts`). Verifies that the badge reads `GET /tasks/summary` for a permitted session, displays **unassigned + mine**, reacts to task-specific notifications (open, overdue), and displays nothing when the session lacks the `read Task` ability or has signed out.

## Key elements

- **`wireBadge()`** — Locates the `TaskInbox` entry in `tasksModule.navigation` and invokes its `badge` accessor inside a fresh `effectScope()`, returning the reactive `Ref<number | undefined>` the shell would render.
- **`signIn(can)`** — Populates the session store with a stub viewer (`staff-1`) and the given `[ability, resource]` pairs, simulating an authenticated staff member.
- **`counts` / `reads`** (module-level) — Track the current `GET /tasks/summary` payload and record every request (including the `Session-Passive` header) so tests can assert both the value and the number of reads.
- **`describe('the task badge')`** — Five cases:
  - Permitted user sees `unassigned + mine` (e.g. 3 + 2 → 5) via a passive read.
  - Unpermitted user gets `undefined` badge and zero HTTP calls.
  - Sign-out (clearing `accessToken`) clears the badge.
  - A task notification (`task-opened`) triggers a re-read; a non-task notification (`purchase-hold-placed`) does not.
  - An overdue reminder (`task-overdue`) also triggers a re-read.

## Relationships

- **`src/modules/tasks/module.ts`** — The test imports the default export (`tasksModule`) and accesses its `navigation` array to locate the `TaskInbox` entry and invoke its `badge` accessor.
- **`tests/support/stub.ts`** — Provides `asStub<SessionViewer>()` to build a minimal session viewer object for `useSessionStore`.
- **`tests/support/unit/msw-server.ts`** — Provides the MSW `server` instance; tests register a handler for `GET */tasks/summary` that records headers and returns the configurable `counts` payload.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at module scope to connect the tasks module into the core DI/graph so that `tasksModule.navigation` is populated in the test environment.

## Notes

- The badge formula is **unassigned + mine** (not `open` or `overdue`); the test data (3 + 2 = 5, 4 + 2 = 6) confirms this.
- The `Session-Passive: true` header is asserted, indicating the badge read is a "passive" (non-interactive) request.
- Notification filtering is by **code** in `meta.notification.code`; only codes prefixed with `notifications.staff.task-*` trigger a re-read. A `purchase-hold-placed` code is explicitly tested as a non-trigger.
- `wireModulesIntoCore()` runs at import time (not inside `beforeEach`), so it executes exactly once for the whole file.
- Pinia is reset via `setActivePinia(createPinia())` in `beforeEach`, but the effect scope in `wireBadge()` is created per-call, isolating reactivity between tests.
