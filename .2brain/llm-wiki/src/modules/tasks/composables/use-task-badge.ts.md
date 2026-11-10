---
source: src/modules/tasks/composables/use-task-badge.ts
sha256: 46c3de71ba8ae7893e9553df82ad4664dd68bb9eb72122bc9d9cc61735873cc1
signature: 5f1ffa39a6168ca4e3bc2f5b4289fad2bcaaa8e18dcab7ef77175bcba40ae097
generated_at: 2026-11-10T05:56:21.774725+00:00
model: ollama:qwen3.8:27b
---

# src/modules/tasks/composables/use-task-badge.ts

## Purpose

Provides the reactive badge count shown on the Tasks entry in the app's navigation. It reads `GET /tasks/summary` (via the tasks store) when an authenticated person with `read` capability on `Task` is present, and re-reads whenever a task-related inbox notice arrives—eliminating the need for polling.

## Key elements

- **`useTaskBadge`** (exported) — The single public entry point. Returns a `Ref<number | undefined>` that resolves to the sum of the reader's and unassigned task counts from the store's summary, or `undefined` while no data exists. Intended to be called once from the nav entry's `badge` accessor.
- **`useTaskNoticeCount`** (internal) — Computes how many inbox notices carry a code starting with `notifications.staff.task-`. The count is the trigger to re-fetch the summary.
- **`readerId`** (internal computed) — Resolves to the session viewer's id when the person is authenticated *and* can read `Task`; otherwise `undefined`. Used as the watch source so the summary is (re)loaded per-person.
- **`TASK_NOTICE_PREFIX`** — Constant `'notifications.staff.task-'`; the shared prefix for `task-opened`, `task-due-soon`, `task-overdue`, and `task-assigned` notice codes.

## Relationships

- **`src/modules/tasks/store.ts`** — Imported as `useTasksStore`. This composable pulls the `summary` ref out of that store (via `storeToRefs`), calls the store's summary-loading method to populate it, and clears it when no reader is present. The final badge value is derived from the store's summary data.
- **`src/modules/tasks/module.ts`** — Module-level registration file for the tasks feature; this composable lives in the same module directory and contributes to the tasks module's public composable surface.

## Notes

- The first `watch` uses `flush: 'post'` so it fires *after* the session store's own per-person reset has run, guaranteeing the summary load lands on a clean store state.
- The notice watch only re-fetches when the count **increases** (`now > before`); clearing all notices does not trigger a read.
- A failed summary load does **not** reset the badge to zero—`useAmbientError` surfaces the failure to the user once, and the previous count remains.
- The returned ref is `undefined` (not `0`) when there is no reader or no summary; the nav entry should treat that as "hide the badge."
