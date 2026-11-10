---
source: tests/support/e2e/a11y-task.ts
sha256: c5ac0ea5d572a6676267097e40ee9408c823bd8b0029f4e3282c9367a4db30c6
signature: 0ba0177a49d800c6e821bd3e96c49eeb340aef42aab951329fae8cad5b428271
generated_at: 2026-11-10T07:26:19.735959+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/a11y-task.ts

## Purpose

Node-side handler for the `cy.checkPageA11y()` accessibility sweep. It persists axe violations that the browser-side check only logs (and thus loses in `cypress run`), writing one JSON report per spec under `reports/a11y/` so that future threshold changes start from historical data.

## Key elements

- **`A11yViolationRecord`** (interface) — the subset of an axe `Result` kept per violation: `id`, `impact`, `help`, `helpUrl`, `tags`, and `nodes` (CSS selector target + HTML snippet). Enough to locate the element without storing the full DOM.
- **`A11yRecordRequest`** (interface) — the payload the browser sends to the task: spec name, human-readable context label, the audited URL, and the violation array.
- **`recordA11yViolations(request, directory)`** (exported function) — the `cy.task` entry point. Delegates to `recordSpecEntry` from `spec-report.ts` and returns the absolute path of the written file (a `cy.task` must return a serialisable value; returning `undefined` would fail the command).

## Relationships

- **`cypress.config.ts`** — registers this function as the `recordA11yViolations` task and supplies the `reports/a11y` output directory at call time.
- **`tests/support/e2e/spec-report.ts`** — provides `recordSpecEntry`, the shared read-merge-write helper that creates or appends to the per-spec JSON file. `recordA11yViolations` is a thin adapter that shapes the request and calls into it.

## Notes

- The browser side of `cy.checkPageA11y()` gates the test on `serious`/`critical` violations and only *logs* lighter findings. This task exists specifically to capture those lighter findings durably; it does not itself assert or fail anything.
- The function must return a string (the file path). A `cy.task` that returns `undefined` causes Cypress to treat the command as failed — this is why the return value is not optional.
- File naming and merge semantics (one file per spec, one entry per audited state/context) are owned by `spec-report.ts`; this file only shapes the per-entry payload (`url`, `recordedAt`, `violations`).
