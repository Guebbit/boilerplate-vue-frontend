---
source: tests/e2e/specs/journeys/at5-task-filters.cy.ts
sha256: d51f58c8027741576654a52d230de69eb29b9de252fec8a8997690b5090915cc
signature: cad54e7916c0a0074825a0829fee9a0697a9c0a237ea3e57003d339a7625e98a
generated_at: 2026-11-10T06:52:11.303651+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/at5-task-filters.cy.ts

## Purpose

End-to-end journey test for the Tasks page filter controls (text, email, status) and the reset action. It verifies that each filter narrows the task inbox to the matching entries and that reset restores the full list. Because the `shop` seed contains no tasks, the test writes three of its own via the admin API.

## Key elements

- **`contact(email, subject, extra?)`** — POSTs a new task as admin through `/tasks`. The optional `extra` object lets callers inject honeypot fields (e.g. `website`) without changing the signature.
- **`idOf(subject)`** — Searches tasks by subject via `POST /tasks/search` and returns the first matching `id`. Needed because the creation response carries no body.
- **`search()`** — Clicks `[data-test=search-submit]` and calls `cy.settleNetwork()` so the UI has finished updating before assertions.
- **`describe('AT5 · Tasks page filters')`** — Single `it` block that:
  1. Creates three tasks: "Kennel question" (new), "Invoice question" (new → resolved), and "Buy now" (spam via honeypot `website` field).
  2. Asserts all three are visible.
  3. Filters by text ("Kennel"), email ("bob@example.com"), and each status value (Resolved / Spam / New), confirming exactly one result per filter.
  4. Resets and confirms all three reappear.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The test assumes the **honeypot mechanism** converts a task to *Spam* status when the `website` field is present in the submission payload; it does not explicitly set a status.
- `idOf` is only used once (to resolve "Invoice question" so it can be marked resolved). The other two tasks are never fetched by id.
- `beforeEach` calls `cy.visit('/en')` then `cy.restore()`, implying `cy.restore()` resets the app state to the seed — the subsequent `cy.visit('/en/tasks')` inside the test is the first real page load.
- The test is a single monolithic `it` block rather than one per filter; all assertions run sequentially in one scenario.
- The `requires-module: tasks` header comment indicates a dependency on the tasks module at the application level, but no specific file-level graph neighbor is recorded.
