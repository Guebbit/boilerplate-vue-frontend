---
source: tests/support/e2e/touch-task.ts
sha256: 134af7a5a2c41cfbe41457a761db48d8ac13ce868d5718d3312ce70a5037f018
signature: 44bf38f41a2f9039153956b10ef4daedf75d66fcf6eb14159e6bfbb7f084e00a
generated_at: 2026-11-10T07:36:47.120895+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/touch-task.ts

## Purpose

Node-side task handler that persists touch-reachability findings to disk (`reports/touch/<spec>.json`). It exists because hint-level findings (those that don't fail a test) would otherwise be invisible in `cypress run` output, and the browser cannot write files directly. The output is CI-uploaded alongside a11y reports.

## Key elements

- **`TouchRecordRequest`** — interface describing one page's scan: `spec` (relative spec name, used as filename), `context` (label passed by the caller), `url` (page URL at scan time), and `findings` (`TouchFinding[]`).
- **`recordTouchFindings(request, directory)`** — the exported task callback. Delegates to `recordSpecEntry` to write a JSON report containing the URL, ISO timestamp, and findings. Returns the absolute report file path.

## Relationships

- **`cypress.config.ts`** — registers `recordTouchFindings` as a task so the browser side can invoke it, and supplies the `reports/touch` directory path.
- **`tests/support/e2e/touch.ts`** — the browser-side counterpart; the command defined there sends a `TouchRecordRequest` payload to this task.
- **`scripts/e2e/touch-findings.ts`** — provides the `TouchFinding` type used in the request and report.
- **`tests/support/e2e/spec-report.ts`** — provides `recordSpecEntry`, the shared helper that actually writes the per-spec JSON file; this module is a thin domain wrapper around it.

## Notes

- The `directory` parameter is not hardcoded here; the config passes `reports/touch`. This keeps the path configurable per project.
- `recordSpecEntry` handles the per-spec file naming and merge logic, so this file doesn't need to know the on-disk layout.
- The task is intentionally trivial (one delegation call) to keep the boundary between browser payload and disk format in one place.
