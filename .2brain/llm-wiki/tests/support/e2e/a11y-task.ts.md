---
source: tests/support/e2e/a11y-task.ts
sha256: 3cc4f8ed973e112d6c3938c4181ae1874f7a2ef75c705655c0597ab0c3279dbf
generated_at: 2026-10-17T02:24:19.232674+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/a11y-task.ts

## Purpose

Persists every axe accessibility finding to disk as a JSON file (one per spec) so that non-blocking violations—those below the `serious`/`critical` threshold that only get logged in the browser—survive the test run. This gives CI a durable artifact to upload and provides a baseline to compare against when the a11y threshold is later tightened.

## Key elements

- **`A11yViolationRecord`** (exported interface) — A trimmed axe `Result`: `id`, `impact`, `help`, `helpUrl`, `tags`, and `nodes` (target selectors + HTML). Enough to locate the element without storing the full DOM.
- **`A11yRecordRequest`** (exported interface) — The payload the browser side sends to the task: `spec` (relative spec path), `context` (human-readable page label), `url`, and the `violations` array.
- **`A11yReportEntry`** (internal) — One audited page: `url`, `recordedAt` (ISO timestamp), `violations`.
- **`A11yReport`** (internal) — One spec's report file: `spec` name plus `entries` keyed by context label.
- **`specSafeName`** (exported) — Converts a spec path like `src/modules/users/tests/e2e/a11y.cy.ts` into a filesystem-safe filename (`src-modules-users-tests-e2e-a11y-cy`). Strips `.ts`, replaces non-alphanumeric runs with `-`.
- **`readReport`** (internal) — Reads an existing report JSON or returns a fresh empty `{ spec, entries: {} }` on first write or a corrupted file.
- **`recordA11yViolations`** (exported) — The main workhorse: creates the output directory, reads (or initializes) the spec's report, overwrites the entry for `request.context`, writes the file, and returns the absolute file path (required because Cypress tasks must return a serialisable value).

## Relationships

- **`cypress.config.ts`** — Registers `recordA11yViolations` as a `cy.task`. The config supplies the output directory (`reports/a11y`) and wires the task into the `cypress run` / `cypress open` lifecycle. The browser-side `cy.checkPageA11y()` command calls this task via `cy.task`.

## Notes

- **One file per spec, keyed by context label.** A retried test overwrites its own entry rather than appending, so no duplicates accumulate. CI shards run disjoint spec sets, avoiding cross-process writes to the same file.
- **`readReport` swallows all errors** (missing file, truncated JSON from a crashed run) and starts fresh—by design, the current run's data is authoritative.
- **The task must return a string** (the file path). Returning `undefined` would cause Cypress to fail the command.
- **Sibling pattern:** mirrors `visual-task.ts` for visual diffs—both exist because the browser cannot write files.
