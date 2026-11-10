---
source: tests/support/e2e/spec-report.ts
sha256: 91197a683ca7d1b531e6f2e44c2e4fe85a67147d56a30b207435054592a7c774
signature: d034fdf47ff77ba770b2734822fe3409f1566523ba81f773bc47696bebe29a0d
generated_at: 2026-11-10T07:35:40.942504+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/spec-report.ts

## Purpose

Provides a read-merge-write helper for per-spec JSON report files used by E2E audit tasks. Each spec gets its own report file; entries are keyed by the audited state's label so that re-running a state overwrites its entry rather than duplicating it. Exists so that multiple Cypress tasks can persist structured audit results to disk without each implementing their own file I/O.

## Key elements

- **`specSafeName(spec)`** (exported) — converts a spec path like `src/modules/users/tests/e2e/a11y.cy.ts` into a flat filename slug (`src-modules-users-tests-e2e-a11y-cy`) by stripping `.ts` and replacing all non-alphanumeric runs with hyphens.
- **`recordSpecEntry(directory, spec, context, entry, suffix?)`** (exported) — the main entry point. Creates the target directory, reads the existing report (or starts a fresh one), sets `report.entries[context] = entry`, writes the file, and returns the absolute file path. The optional `suffix` is appended before `.json` to let a second report of the same spec live beside the first.
- **`SpecReport`** (interface, not exported) — shape of the JSON on disk: `{ spec: string; entries: Record<string, unknown> }`.
- **`readReport(file, spec)`** (internal) — reads and parses the JSON; on any failure (missing file, corrupt/half-written JSON) returns an empty report so the caller can proceed with a fresh write.

## Relationships

- **`tests/support/e2e/a11y-task.ts`** — calls `recordSpecEntry` to persist accessibility audit results per spec.
- **`tests/support/e2e/touch-task.ts`** — calls `recordSpecEntry` to persist touch-interaction audit results per spec.
- **`tests/support/e2e/layout-task.ts`** — calls `recordSpecEntry` with a `suffix` parameter so its report file is named distinctly from the other tasks' reports for the same spec.

## Notes

- `recordSpecEntry` must return the file path (a serialisable value); returning `undefined` would cause Cypress to mark the task command as failed.
- The read step is intentionally lenient: a half-written or missing file is treated as "start fresh." This means a crashed run can leave a partial file that the next run silently overwrites — by design, the entries being written now are authoritative.
- CI shards specs across processes, so there is no concurrent-write contention on a single report file.
