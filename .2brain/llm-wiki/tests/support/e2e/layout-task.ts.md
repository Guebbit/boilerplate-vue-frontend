---
source: tests/support/e2e/layout-task.ts
sha256: db29de35c56845685f0889e64431ee452e9ba928b19333faccf4dfa6860a5a27
signature: fa52837096394ac382282f5b5d6fa8f3bdad7cf7e9ad38caf86a3a7deb8b97ab
generated_at: 2026-11-10T07:33:14.138115+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/layout-task.ts

## Purpose

The Node.js-side task that persists layout findings to disk as JSON. It exists because `cypress run` discards the browser log, so advisory and accepted findings (which don't fail the spec) would otherwise be lost. The browser cannot write files, hence the task.

## Key elements

- **`LayoutRecordRequest`** (interface) — The payload shape the browser sends to this task: `spec` (relative spec path, used as the filename), `context` (state label / size / text-mode key), `url`, and `findings` (array of `LayoutFinding`).
- **`recordLayoutFindings`** (exported function) — Writes one audited state's findings into `reports/a11y/<spec>.layout.json` by delegating to `recordSpecEntry`. Returns the absolute path of the written file.

## Relationships

- **`cypress.config.ts`** — Registers `recordLayoutFindings` as a task so the browser can invoke it (per the module docblock).
- **`scripts/e2e/layout-findings.ts`** — Source of the `LayoutFinding` type imported by this file.
- **`tests/support/e2e/layout-checks.ts`** — The browser-side counterpart; this file is the "Node half" of the layout-check flow it implements.
- **`tests/support/e2e/spec-report.ts`** — Provides `recordSpecEntry`, the shared file-I/O helper that this function delegates to.

## Notes

- The output file suffix is `.layout` (→ `<spec>.layout.json`), kept beside the axe report so CI uploads both from the same `reports/a11y` directory.
- `recordedAt` is stamped at write time inside this file, not by the caller — the timestamp reflects when the Node process handled the task, not when the browser captured the state.
- The `spec` field is expected to be `Cypress.spec.relative`; it becomes the base filename, so it must not contain path separators that would create unexpected subdirectories.
