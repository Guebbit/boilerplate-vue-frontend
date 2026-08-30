# docs/tools/testing-quickstart.md

## Purpose

Quick-reference guide for all test commands in the repo. It maps each `npm run` test script to the question it answers, its runtime cost, and whether it is part of the CI gate. Intended as the first page a developer (or AI assistant) opens when deciding which test to run or how to interpret a failure.

## Key elements

- **30-second command set** — the four most common invocations: `test:module -- <path>`, `test:unit`, `test:report`, `complete`.
- **Command reference table** — 10 rows covering `test:module`, `test:unit`, `test:unit:coverage`, `test:unit:report`/`test:report`, `test:e2e`, `test:e2e:spec`, `test:e2e:live`, `test:e2e:visual`, `test:mutation`, and `complete`, each annotated with time and gate status.
- **Single-test invocation patterns** — path-based filtering for `test:module`; `E2E_SPEC` env var for `test:e2e:spec` (because `start-server-and-test` accepts exactly three args); raw `npx vitest` for watch mode.
- **Failure-reading workflow** — `test:report` JSON output format (module summary, slowest suites, coverage rows, failure list); prerequisite that `test:unit:report` must have written the JSON and `coverage/lcov.info` must exist for coverage rows.
- **Three e2e profiles table** — `demo` (in-memory backend, in gate), `live` (fully composed real backend, CI job), `visual` (regression, explicitly out of gate).
- **Per-module suite layout** — expected file tree under `src/modules/<name>/tests/` including unit specs, functional e2e, a11y sweep, and visual specs; notes the a11y mandate enforced by `tests/cross-cutting/a11y-coverage.spec.ts`.
- **Visual baseline update procedure** — diff-first workflow via `reports/visual-diff/`, then `test:e2e:visual:update`.

## Relationships

- **`docs/tools/testing-and-docs.md`** — the overview page that this file links to as "Related." `testing-and-docs.md` explains the *why* behind each testing layer; this page is the *how-to-run* companion. A reader is expected to land here first, then follow the "Related" link back for deeper rationale.

## Notes

- `test:e2e:spec` uses the `E2E_SPEC` environment variable rather than a trailing CLI arg because `start-server-and-test` parses only three positional arguments; an extra positional would land in the wrong slot.
- `test:report` requires a prior JSON report (produced by `test:unit:report`). Coverage lines appear only if `coverage/lcov.info` exists on disk (produced by `test:unit:coverage`).
- A failing e2e shard writes its full Cypress log to `reports/e2e/shard-<n>.log`; the terminal output may be truncated, the file will not.
- `test:e2e:visual` is deliberately **not** in the CI gate; visual baselines are reviewed as images in pull requests, so re-recording without inspecting the diff defeats the purpose.
- Modules that serve no page (e.g. `delivery`, `payments`) are exempt from the mandatory `e2e/a11y.cy.ts` requirement.
