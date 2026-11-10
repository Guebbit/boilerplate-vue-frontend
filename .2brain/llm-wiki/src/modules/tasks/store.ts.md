---
source: src/modules/tasks/store.ts
sha256: 00d4cd4d1f67294b2a5cd19ddb84f2f7321fd7e50882fcc4d1f730ea78b7ee2f
signature: 80668c2d7970db8274a3e54fba4aa2daeca1ae0bbe2d5e6ee5177a96938875bc
generated_at: 2026-11-10T05:57:12.832251+00:00
model: ollama:qwen3.8:27b
---

# src/modules/tasks/store.ts

## Purpose

Pinia store for the tasks module. It exposes a public `submitContact` action for the contact form and an admin inbox (search, status transitions, delete) built on `useStructureCrudApi`, following the same pattern as the users, products, and orders stores.

## Key elements

- **`useTasksStore`** — the single exported store (`'tasks'`).
- **`TaskFilters`** — local type: `SearchTasksRequest` minus `page`/`pageSize`/`sort`, with `sort` re-typed as a single CSV string (URL-friendly).
- **`requests` / `requestsList`** — item dictionary and list from the CRUD primitive.
- **`filters`, `loading`, `pageCurrent`, `pageSize`, `pageTotal`, `pageItemList`** — inbox search state and pagination.
- **`fetchPaginationRequests` / `watchSearchRequests` / `deleteRequest`** — CRUD primitive actions (fetch page, reactive re-search, delete one).
- **`task`** (`ref<Task>`) — the currently open task, kept in sync by the `keep` helper after every read or status action.
- **`summary`** (`ref<TaskSummary>`) — badge counts (open, mine, overdue, unassigned) scoped to the caller's jurisdiction.
- **`loadTask(id)`** — fetches one task (notes, assignee, related tasks) for the detail page.
- **`loadSummary()`** — fetches badge counts; wrapped in `asPassive()` so it does not block idle-timeout.
- **Status doors** — `resolve`, `markSpam`, `reopen`, `assign`, `unassign`, `addNote`. Each returns the updated task via `keep`.
- **`addNote`** — uses `sendKeyed` with a per-subject idempotency key (task id + body) so a lost response never duplicates a note.
- **`submitContact(message, options?)`** — public form submission via `fetchAny` (no inbox cache write). Accepts optional `AxiosRequestConfig` for a `HumanCheck` token. Idempotency key is settled on both success and failure.
- **`noteIdempotencyKeys`** — `useIdempotencyKeys()` instance for notes.
- **`contactIdempotencyKey`** — `useIdempotencyKey()` instance for the contact form.

## Relationships

- **`Contact.vue`** — calls `submitContact`, passing the solved `HumanCheck` token through the `options` parameter.
- **`TaskInbox.vue`** — binds to `filters`, `pageItemList`, `loading`, pagination refs; calls `fetchPaginationRequests`, `watchSearchRequests`, `deleteRequest`.
- **`TaskDetail.vue`** — reads `task`; calls `loadTask`, `resolve`, `markSpam`, `reopen`, `assign`, `unassign`, `addNote`.
- **`use-task-badge.ts`** — calls `loadSummary` and reads `summary` for the staff badge counts.
- **`store.spec.ts`** — unit tests for the store's actions and state.
- **`contact-view.spec.ts`** — tests `submitContact` behavior (idempotency, error handling).

## Notes

- The search endpoint is `POST /tasks/search`, never `GET` — filters and page travel in the body, and a POST is never browser-cached, preventing a stale row after delete + reload.
- `submitContact` goes through `fetchAny` rather than the CRUD primitive's `createOne` deliberately: a public visitor never reads the inbox, so there is no list cache to invalidate.
- The `task` ref is the single source of truth for the detail page; every status door and `loadTask` funnel through `keep`, so the view never re-reads after an action.
- `addNote` idempotency is keyed on `task id + body` (via `forSubject`), not a per-call UUID, because a note has no delete door — a retry must be a no-op, not a duplicate.
- `loadSummary` is wrapped in `asPassive()` to avoid extending a staff session's idle window with an app-initiated request.
