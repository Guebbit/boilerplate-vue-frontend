# tests/support/e2e/a11y-task.ts

## Purpose

Node-side Cypress task that persists axe accessibility findings to a JSON file per spec under `reports/a11y/`. The browser-side `cy.checkPageA11y()` gates on `serious`/`critical` and merely logs lighter findings, which vanish after the run. This task writes every finding to disk so that a future threshold tightening starts from recorded data rather than rediscovery.

## Key elements

- **`A11yViolationRecord`** – interface capturing the actionable subset of an axe `Result` (id, impact, help, tags, target selectors + HTML snippet).
- **`A11yRecordRequest`** – payload passed from the browser task: spec name, context label, URL, and the violation list.
- **`A11yReport` / `A11yReportEntry`** – the on-disk JSON shape: one file per spec, with an `entries` map keyed by context label, each entry holding URL, timestamp, and violations.
- **`specSafeName(spec)`** – strips `.ts` and replaces non-alphanumeric runs with `-`, turning a spec path into a safe filename (e.g. `src-modules-users-tests-e2e-a11y-cy`).
- **`recordA11yViolations(request, directory)`** – the task body. Reads (or initializes) the existing report, upserts the entry for the given context, writes pretty-printed JSON, and returns the absolute file path.

## Relationships

- **`cypress.config.ts`** – registers `recordA11yViolations` as the `cy.task` handler and supplies the `reports/a11y/` directory.
- **`tests/support/e2e/commands.ts`** – the browser-side `cy.checkPageA11y()` command that calls `cy.task` with an `A11yRecordRequest` payload.
- **`reports/a11y/`** – output directory; one JSON file per spec, uploaded as a CI artifact.
- **`docs/tools/accessibility-testing.md`** – documents the overall a11y testing workflow that this task supports.

## Notes

- `recordA11yViolations` **must return a value** (the file path); returning `undefined` causes Cypress to fail the command.
- `readReport` swallows parse errors and returns an empty report—this covers both first-write and the case where a crashed run left a half-written file.
- Entries are keyed by the `context` label, so a **retried test overwrites its own entry** rather than appending a duplicate.
- The four CI shards each run disjoint spec sets, so no two Node processes write the same file concurrently.
- The comment at the top references `visual-task.ts` as the analogous pattern (browser can't write files, so a task is needed).
