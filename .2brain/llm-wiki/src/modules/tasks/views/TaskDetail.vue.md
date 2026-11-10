---
source: src/modules/tasks/views/TaskDetail.vue
sha256: 46c329fe3de2c51e5ca361fd9e1d548e30146abdff6d1101963b632dcbf8519a
signature: 806f185835cfae58fbfde3d5fb2c0deabbf5c719e9058284c610e727b56bc502
generated_at: 2026-11-10T06:01:52.804345+00:00
model: ollama:qwen3.8:27b
---

# src/modules/tasks/views/TaskDetail.vue

## Purpose

The single-task detail page. It renders one task's subject, metadata, status controls (assign / unassign / resolve / mark-spam / reopen), a staff note thread with composer, and links to earlier tasks on the same record. All mutations go through the tasks store; the page never re-fetches after an action.

## Key elements

- **Named component block (`export default { name: 'TaskDetailPage' }`)** — Required alongside `<script setup>` so devtools and `<KeepAlive>` can reference the component by name.
- **`taskId` computed + `watch`** — Extracts the route param and calls `store.loadTask(id)` (immediate), routing 404/403 to `useMissingRecord`.
- **`handle(move, success)`** — Wraps a store mutation through `useRowActions` + `useBlockingError`; the store updates `task` in place and a toast fires on success.
- **`handleNote()`** — Trims the draft, calls `store.addNote`, clears the composer on success.
- **`recordLink` computed** — Builds a `router-link` target via `linkIfRouted` only for `order` and `user` record types; other types render as plain text.
- **`heldByOther` computed** — Switches the take-button label between "take" and "take over" based on whether a different user is the current assignee.
- **Template cards** — Three `v-card` sections gated by `task`: detail + action buttons, note thread + composer, earlier-tasks list.

## Relationships

- **`src/modules/tasks/store.ts`** — Primary data source. Calls `loadTask`, `assign`, `unassign`, `resolve`, `markSpam`, `reopen`, `addNote`, and reads the reactive `task` ref via `storeToRefs`.
- **`src/modules/tasks/task-kind.ts`** — Provides `taskKindKey(kind)` to map a task's kind to its i18n label.
- **`src/modules/tasks/task-ref.ts`** — Provides `taskRef(id)` for the human-readable reference number shown in the header.
- **`src/modules/tasks/tests/detail-view.spec.ts`** — Unit-test suite targeting this component's rendering and interaction logic.
- **`tests/support/e2e/design-capture.ts`** — E2E test support that exercises this page via its `data-test` attributes.

## Notes

- The server gates available actions via `task.actions.*` booleans; the template renders a button only when the corresponding flag is truthy. No client-side permission logic is duplicated.
- `linkIfRouted` returns `undefined` when no matching route is registered in the current build, so record links degrade to plain text gracefully.
- All interactive elements carry a `data-test` attribute used by the E2E suite—keep them in sync if labels or structure change.
- The note composer caps input at 5 000 characters (`maxlength`) but does not validate on the client beyond that.
