---
source: src/modules/tasks/task-ref.ts
sha256: ec79b716586ee7aff1579ff6b36203a349781324f5e97400656991b6df47aa3e
signature: c0a0a7412781f38aea237eb2e14ebff99e4f69e7ded2feae2645a72fe51c3fb1
generated_at: 2026-11-10T05:57:24.253173+00:00
model: ollama:qwen3.8:27b
---

# src/modules/tasks/task-ref.ts

## Purpose

Provides a single helper that derives a short task reference (`#ref`) from a task's full ID by taking its last eight characters. This mirrors the format the backend embeds in support-mailbox subject lines, letting staff visually match a mailbox thread to its corresponding task without needing the full ID.

## Key elements

- **`taskRef(id: string): string`** — Returns the last 8 characters of a task ID. The sole and only export in this file.

## Relationships

- **`src/modules/tasks/views/TaskDetail.vue`** — Consumes `taskRef` to display the short reference in a task's detail view.
- **`src/modules/tasks/views/TaskInbox.vue`** — Consumes `taskRef` to display the short reference in the inbox listing.

## Notes

- The function assumes the input is at least 8 characters long (no length guard is present).
- The result is meant to be rendered with a `#` prefix (e.g. `#a1b2c3d4`), but the function itself returns only the eight-character string without the `#`.
