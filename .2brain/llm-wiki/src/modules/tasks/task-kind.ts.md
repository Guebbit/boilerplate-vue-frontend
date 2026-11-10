---
source: src/modules/tasks/task-kind.ts
sha256: a33a58a97fae35aa39986a5aca3259c12aab4f929893b29a28b6af089a910a49
signature: eaf786245d1e2ad64ff7301ecd32db5c347aca9ce639844c833aa4f1363aac06
generated_at: 2026-11-10T05:57:19.805541+00:00
model: ollama:qwen3.8:27b
---

# src/modules/tasks/task-kind.ts

## Purpose

Provides a single helper that maps a raw task-kind string from the API to a translation key. Because task kinds form an open enum (the server may introduce new kinds the client doesn't yet know), the helper falls back to a generic `task-kind.unknown` key so unknown kinds render as "Task" rather than crashing or showing a blank.

## Key elements

- **`taskKindKey(kind: string): string`** — The sole export. Checks whether `kind` is a member of the `TaskKind` enum (`@/types/enums.ts`). Returns `` `task-kind.${kind}` `` for known kinds; returns `'task-kind.unknown'` for anything else.

## Relationships

- **`src/modules/tasks/views/TaskDetail.vue`** — Consumes `taskKindKey` to resolve the display label for a single task's kind.
- **`src/modules/tasks/views/TaskInbox.vue`** — Consumes `taskKindKey` to label each task in the inbox list.
- **`contracts/rest/index.ts`** — Defines the REST payload shape whose `kind` field is the input to `taskKindKey`.
- **`src/modules/tasks/tests/task-kind.spec.ts`** — Unit tests for `taskKindKey` (known and unknown kind cases).

## Notes

- Production response validation is **report-only** (`isReportOnly` in `src/infrastructure/http/validate.ts`), so a kind not in the local enum will reach the UI untouched. The fallback in `taskKindKey` is the last line of defense, not the validation layer.
- The enum check uses `Object.values(TaskKind)` — adding a new member to `TaskKind` automatically makes it "known" without touching this file.
- The translation key convention is `task-kind.<lowercase-kind>`; the i18n catalog must contain an entry for every enum value plus `task-kind.unknown`.
